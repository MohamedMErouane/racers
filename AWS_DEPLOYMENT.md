# AWS Deployment Guide for Racers.fun

## Prerequisites
- AWS Account with billing enabled
- AWS CLI installed and configured
- Docker installed locally
- Domain name (can use Route 53 or external provider)

## Architecture Overview
- **ECS Fargate**: Container hosting (always-on)
- **RDS PostgreSQL**: Database
- **ElastiCache Redis**: Caching layer
- **Application Load Balancer**: SSL termination & routing
- **Route 53**: DNS management
- **Secrets Manager**: Secure credential storage
- **CloudWatch**: Monitoring & logging

## Step 1: Create Infrastructure

### 1.1 Create VPC and Security Groups
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=racers-vpc}]'

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=racers-igw}]'

# Create subnets (replace VPC_ID with actual ID)
aws ec2 create-subnet --vpc-id VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
```

### 1.2 Create RDS PostgreSQL
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name racers-db-subnet \
  --db-subnet-group-description "Racers DB Subnet Group" \
  --subnet-ids subnet-xxxxxx subnet-yyyyyy

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier racers-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username racers \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --db-subnet-group-name racers-db-subnet \
  --vpc-security-group-ids sg-xxxxxxxx
```

### 1.3 Create ElastiCache Redis
```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name racers-cache-subnet \
  --cache-subnet-group-description "Racers Cache Subnet Group" \
  --subnet-ids subnet-xxxxxx subnet-yyyyyy

# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id racers-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --cache-subnet-group-name racers-cache-subnet \
  --security-group-ids sg-xxxxxxxx
```

## Step 2: Store Secrets in AWS Secrets Manager

```bash
# Store database URL
aws secretsmanager create-secret \
  --name "racers/database-url" \
  --description "Racers Database URL" \
  --secret-string "postgresql://racers:PASSWORD@racers-db.xxxxxxxxx.us-east-1.rds.amazonaws.com:5432/racers"

# Store Redis URL
aws secretsmanager create-secret \
  --name "racers/redis-url" \
  --description "Racers Redis URL" \
  --secret-string "redis://racers-redis.xxxxxx.cache.amazonaws.com:6379"

# Store Privy secret
aws secretsmanager create-secret \
  --name "racers/privy-secret" \
  --description "Privy App Secret" \
  --secret-string "your_privy_app_secret"

# Store Phantom private key
aws secretsmanager create-secret \
  --name "racers/phantom-key" \
  --description "Phantom Wallet Private Key" \
  --secret-string "[1,2,3,4,5...]"  # Your private key array
```

## Step 3: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository --repository-name racers-fun

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push image
docker build --build-arg PRIVY_APP_ID=your_privy_app_id -t racers-fun .
docker tag racers-fun:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/racers-fun:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/racers-fun:latest
```

## Step 4: Create ECS Cluster and Service

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name racers-cluster --capacity-providers FARGATE

# Create IAM roles
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Register task definition
aws ecs register-task-definition --cli-input-json file://aws-ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster racers-cluster \
  --service-name racers-service \
  --task-definition racers-fun:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxx,subnet-yyyyyy],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}"
```

## Step 5: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name racers-alb \
  --subnets subnet-xxxxxx subnet-yyyyyy \
  --security-groups sg-xxxxxxxx

# Create target group
aws elbv2 create-target-group \
  --name racers-targets \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxxxxxxx \
  --target-type ip \
  --health-check-path /health

# Create listener (HTTP -> HTTPS redirect)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/racers-alb/50dc6c495c0c9188 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

## Step 6: Set up SSL Certificate

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names www.your-domain.com \
  --validation-method DNS

# Create HTTPS listener (after certificate validation)
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/racers-alb/50dc6c495c0c9188 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/racers-targets/50dc6c495c0c9188
```

## Step 7: Configure Route 53 (Optional)

```bash
# Create hosted zone
aws route53 create-hosted-zone --name your-domain.com --caller-reference $(date +%s)

# Create A record pointing to ALB
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://dns-record.json
```

## Step 8: Set up CloudWatch Monitoring

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/racers-fun

# Create CloudWatch dashboard
aws cloudwatch put-dashboard --dashboard-name "Racers-Dashboard" --dashboard-body file://dashboard.json
```

## Step 9: Auto Scaling Configuration

```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/racers-cluster/racers-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --policy-name racers-scale-up \
  --service-namespace ecs \
  --resource-id service/racers-cluster/racers-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Cost Optimization Tips

1. **Use t3.micro instances** for development
2. **Set up CloudWatch billing alerts**
3. **Use Spot instances** for non-critical workloads
4. **Configure auto-scaling** to scale down during low usage
5. **Use RDS scheduled scaling** for database

## Maintenance Commands

```bash
# Update service
aws ecs update-service --cluster racers-cluster --service racers-service --task-definition racers-fun:2

# Scale service
aws ecs update-service --cluster racers-cluster --service racers-service --desired-count 3

# View logs
aws logs tail /ecs/racers-fun --follow

# Check service health
aws ecs describe-services --cluster racers-cluster --services racers-service
```

## Estimated Monthly Costs (us-east-1)
- **ECS Fargate (1 task)**: ~$15-25
- **RDS PostgreSQL (t3.micro)**: ~$13
- **ElastiCache Redis (t3.micro)**: ~$15
- **Application Load Balancer**: ~$23
- **Data Transfer**: ~$5-10
- **Total**: ~$71-86/month