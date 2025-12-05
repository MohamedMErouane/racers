// Complete raceClient.js with all methods

export class RaceClient {
  constructor(socket, ui = null) {
    this.socket = socket;
    this.ui = ui;
    this.raceState = null;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.characterImages = new Map();
    this.characterFrames = new Map(); // Store both frames for animation
    this.raceStartTime = null;
    this.raceDuration = 35000; // 35 seconds race - longer duration for full distance
    this.currentBackground = null;
    this.currentBackgroundName = 'default';
    this.animationFrame = 0; // Track animation frame for switching
  }

  // Setup event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('race:start', (data) => {
      this.handleRaceStart(data);
    });

    this.socket.on('race:update', (data) => {
      this.updateRaceProgress(data);
    });

    this.socket.on('race:end', (data) => {
      this.handleRaceEnd(data);
    });

    // Initialize canvas
    this.initializeCanvas();
    
    // Load character sprites
    this.loadCharacterSprites();
  }

  // Initialize race canvas
  initializeCanvas() {
    this.canvas = document.getElementById('raceCanvas');
    if (!this.canvas) {
      console.warn('Race canvas not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    
    // Make canvas responsive to container size
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // Set canvas size to fill the full container
    this.canvas.width = Math.max(800, containerRect.width);
    this.canvas.height = Math.max(600, containerRect.height);
    
    // Style canvas to fill container
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.background = '#1a1a2e';
    this.canvas.style.borderRadius = '12px';
    this.canvas.style.display = 'block';
    
    console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
  }

  // Load random race background from your actual images
  loadRandomBackground() {
       const backgrounds = [
      'background-image17.png',           // Desert/Nuketown theme
      'background-image19.png',             // Pure desert theme
      'background-image34.png',        // Night mountain theme
      'background-image37.png',       // Desert/RV theme
      'background-image38.png'          // Colorful fantasy theme
    ];
    // Pick random background
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    const backgroundPath = `images/backgrounds/${randomBg}`;
    
    console.log(`🎨 Loading background: ${backgroundPath}`);
    
    const bgImage = new Image();
    bgImage.onload = () => {
      console.log(`✅ Loaded background: ${backgroundPath}`);
      this.currentBackground = bgImage;
      this.currentBackgroundName = randomBg.replace('.png', '');
    };
    
    bgImage.onerror = () => {
      console.log(`⚠️ Background not found: ${backgroundPath}, using fallback`);
      this.currentBackground = null;
      this.currentBackgroundName = 'default';
    };
    
    bgImage.src = backgroundPath;
  }

  // Load character running sprites
  async loadCharacterSprites() {
    try {
      const response = await fetch('/js/animeRacers.json');
      const racers = await response.json();
      
      racers.forEach(racer => {
        if (racer.name && racer.id) {
          // Load both animation frames for each character
          const frames = {
            frame1: null,
            frame2: null
          };
          
          const characterName = racer.name.toLowerCase();
          
          // Load frame1 (RUNNING FRAME 1 - NOT FACE!)
          const frame1Path = `images/characters/${characterName}-frame1.png`;
          const img1 = new Image();
          img1.onload = () => {
            console.log(`✅ Loaded RUNNING frame1 for ${racer.name}: ${frame1Path}`);
            frames.frame1 = img1;
            this.characterFrames.set(racer.id, frames);
            this.characterImages.set(racer.id, frames.frame1);
          };
          img1.onerror = () => {
            console.warn(`❌ Failed to load running frame1 for ${racer.name}: ${frame1Path}`);
          };
          img1.src = frame1Path;
          
          // Load frame2 (RUNNING FRAME 2 - NOT FACE!)
          const frame2Path = `images/characters/${characterName}-frame2.png`;
          const img2 = new Image();
          img2.onload = () => {
            console.log(`✅ Loaded RUNNING frame2 for ${racer.name}: ${frame2Path}`);
            frames.frame2 = img2;
            this.characterFrames.set(racer.id, frames);
            if (!frames.frame1) {
              this.characterImages.set(racer.id, frames.frame2);
            }
          };
          img2.onerror = () => {
            console.warn(`❌ Failed to load running frame2 for ${racer.name}: ${frame2Path}`);
          };
          img2.src = frame2Path;
          
          console.log(`🏃‍♀️ Loading RUNNING frames for ${racer.name}: ${frame1Path} & ${frame2Path}`);
        }
      });
    } catch (error) {
      console.error('Failed to load character sprites:', error);
    }
  }

  // Handle race start
  handleRaceStart(data) {
    console.log('🏁 Race starting soon...', data);
    
    // Load random background for this race
    this.loadRandomBackground();
    
    this.raceState = {
      racers: data.racers || this.generateMockRacers(),
      isRunning: false, // Don't start immediately
      positions: {}
    };
    
    // Initialize positions
    this.raceState.racers.forEach((racer, index) => {
      this.raceState.positions[racer.id] = {
        progress: 0,
        position: index + 1,
        speed: racer.speed || (Math.random() * 2 + 3),
        currentSpeed: 0 // Initialize current speed for display
      };
    });
    
    // Show race container
    const raceContainer = document.getElementById('raceContainer');
    if (raceContainer) {
      raceContainer.style.display = 'block';
    }
    
    // Initialize displays
    this.initializeDisplays();
    
    // Start countdown
    this.showCountdown();
  }

  // Initialize the position and speed displays
  initializeDisplays() {
    console.log('Initializing race displays');
    
    // Initialize positions display
    const positionsDisplay = document.getElementById('positionsDisplay');
    if (positionsDisplay) {
      positionsDisplay.innerHTML = `
        <div style="color: #fff; font-size: 18px; font-weight: bold; text-align: center; padding: 20px;">
          Race Starting...
        </div>
      `;
      positionsDisplay.style.display = 'block';
      console.log('✅ Positions display initialized');
    } else {
      console.error('❌ positionsDisplay element not found');
    }
    
    // Initialize speed display
    const speedDisplay = document.getElementById('speedDisplay');
    if (speedDisplay) {
      speedDisplay.innerHTML = `
        <div style="color: #fff; font-size: 14px; text-align: center; padding: 20px;">
          <div style="margin-bottom: 8px;">TOP SPEED</div>
          <div style="color: #ffd700; font-size: 32px; font-weight: bold;">--</div>
          <div style="font-size: 16px;">km/h</div>
        </div>
      `;
      speedDisplay.style.display = 'block';
      console.log('✅ Speed display initialized');
    } else {
      console.error('❌ speedDisplay element not found');
    }
  }

  // Add countdown method
  showCountdown() {
    let countdownValue = 3;
    
    const countdownInterval = setInterval(() => {
      // Update countdown display on canvas instead of overlay
      this.drawRaceWithCountdown(countdownValue);
      
      countdownValue--;
      
      if (countdownValue < 0) {
        clearInterval(countdownInterval);
        // Start the actual race
        this.raceStartTime = Date.now();
        this.raceState.isRunning = true;
        this.startRaceAnimation();
      }
    }, 1000);
  }

  // Draw race with countdown overlay
  drawRaceWithCountdown(countdown) {
    if (!this.ctx || !this.raceState) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw race track background
    this.drawRaceTrack();
    
    // Draw racing lanes
    this.drawRacingLanes();
    
    // Draw racers at starting positions
    this.drawRacers();
    
    // Draw countdown in center without blocking the view
    if (countdown > 0) {
      // Semi-transparent background for countdown
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(this.canvas.width/2 - 80, this.canvas.height/2 - 60, 160, 120);
      
      // Countdown number
      this.ctx.fillStyle = '#ff69b4';
      this.ctx.font = 'bold 72px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(countdown.toString(), this.canvas.width/2, this.canvas.height/2 + 20);
      this.ctx.fillText(countdown.toString(), this.canvas.width/2, this.canvas.height/2 + 20);
      
      // "GET READY" text
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText('GET READY!', this.canvas.width/2, this.canvas.height/2 - 20);
    }
  }

  // Generate mock racers for testing
  generateMockRacers() {
    return [
      { id: 1, name: 'Hana', color: '#ff1493', speed: 4.1 },
      { id: 2, name: 'Miku', color: '#00ced1', speed: 4.6 },
      { id: 3, name: 'Akane', color: '#ff4500', speed: 4.8 },
      { id: 4, name: 'Sakura', color: '#ff69b4', speed: 4.5 },
      { id: 5, name: 'Kira', color: '#ffa500', speed: 4.4 },
      { id: 6, name: 'Luna', color: '#9370db', speed: 4.3 },
      { id: 7, name: 'Yuki', color: '#00bfff', speed: 4.2 },
      { id: 8, name: 'Neko', color: '#ffd700', speed: 4.7 }
    ];
  }

  // Start race animation loop - THIS WAS MISSING!
  startRaceAnimation() {
    const animate = () => {
      if (!this.raceState || !this.raceState.isRunning) return;
      
      this.updateRacePositions();
      this.drawRace();
      
      // Check if race should end
      const elapsedTime = Date.now() - this.raceStartTime;
      if (elapsedTime >= this.raceDuration) {
        this.handleRaceEnd();
        return;
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  // Update race positions
  updateRacePositions() {
    if (!this.raceState) return;
    
    const elapsedTime = Date.now() - this.raceStartTime;
    const raceProgress = Math.min(elapsedTime / this.raceDuration, 1);
    
    this.raceState.racers.forEach(racer => {
      const position = this.raceState.positions[racer.id];
      if (!position) return;
      
      // Add some randomness to make race exciting
      const speedVariation = (Math.random() - 0.5) * 0.1;
      const adjustedSpeed = position.speed + speedVariation;
      
      // Update progress - ensure characters can reach and cross the finish line
      // Allow faster characters to finish early and slower ones to catch up
      const speedMultiplier = (adjustedSpeed / 4.5);
      position.progress = Math.min(raceProgress * speedMultiplier * 3.0, 1.5); // Increased multiplier to 3.0 and allow progress up to 1.5 to cross finish line
      
      // Update current speed for display (convert to km/h for realism)
      position.currentSpeed = Math.round(adjustedSpeed * 20 + (Math.random() - 0.5) * 10); // Convert to km/h with variation
      
      // Debug: Log progress for first character to monitor
      if (racer.id === 1 && Math.floor(elapsedTime / 1000) % 5 === 0) {
        console.log(`Character ${racer.name}: progress=${(position.progress * 100).toFixed(1)}%, raceProgress=${(raceProgress * 100).toFixed(1)}%`);
      }
    });
    
    // Update position rankings (highest progress = closest to finish = best position)
    const sortedRacers = [...this.raceState.racers].sort((a, b) => {
      return this.raceState.positions[b.id].progress - this.raceState.positions[a.id].progress;
    });
    
    sortedRacers.forEach((racer, index) => {
      this.raceState.positions[racer.id].position = index + 1;
    });
    
    // Update displays
    this.updatePositionsDisplay(sortedRacers);
    this.updateSpeedDisplay();
  }

  // Update the positions display on the left side
  updatePositionsDisplay(sortedRacers) {
    const positionsDisplay = document.getElementById('positionsDisplay');
    if (!positionsDisplay) {
      console.warn('positionsDisplay element not found');
      return;
    }

    console.log('Updating positions display with', sortedRacers.length, 'racers');
    
    positionsDisplay.innerHTML = '';
    positionsDisplay.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      border-radius: 12px;
      padding: 16px;
      min-width: 200px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      display: block;
    `;

    // Add header
    const header = document.createElement('div');
    header.style.cssText = `
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 12px;
      text-align: center;
      border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      padding-bottom: 8px;
    `;
    header.textContent = 'POSITIONS - 2000m Race';
    positionsDisplay.appendChild(header);

    // Add each racer position
    sortedRacers.forEach((racer, index) => {
      const position = this.raceState.positions[racer.id];
      const positionItem = document.createElement('div');
      positionItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        margin: 4px 0;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        border-left: 4px solid ${racer.color || '#ff69b4'};
      `;

      // Position number
      const posNum = document.createElement('span');
      posNum.style.cssText = `
        color: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#fff'};
        font-size: 16px;
        font-weight: bold;
        min-width: 25px;
      `;
      posNum.textContent = `${index + 1}.`;

      // Character name
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = `
        color: white;
        font-size: 14px;
        font-weight: bold;
        flex: 1;
      `;
      nameSpan.textContent = racer.name;

      // Distance display (total race distance = 2000m)
      const totalRaceDistance = 2000; // meters
      const distanceRun = Math.round(position.progress * totalRaceDistance);
      const progressSpan = document.createElement('span');
      progressSpan.style.cssText = `
        color: ${racer.color || '#ff69b4'};
        font-size: 12px;
        font-weight: bold;
        text-align: right;
        min-width: 50px;
      `;
      progressSpan.textContent = `${distanceRun}m`;

      positionItem.appendChild(posNum);
      positionItem.appendChild(nameSpan);
      positionItem.appendChild(progressSpan);
      positionsDisplay.appendChild(positionItem);
    });
  }

  // Update the speed display on the right side
  updateSpeedDisplay() {
    const speedDisplay = document.getElementById('speedDisplay');
    if (!speedDisplay) {
      console.warn('speedDisplay element not found');
      return;
    }

    console.log('Updating speed display');

    // Find the fastest current speed and leading racer
    let maxSpeed = 0;
    let fastestRacer = null;
    let leadingDistance = 0;
    let leadingRacer = null;
    
    this.raceState.racers.forEach(racer => {
      const position = this.raceState.positions[racer.id];
      if (position) {
        // Check for fastest speed
        if (position.currentSpeed > maxSpeed) {
          maxSpeed = position.currentSpeed;
          fastestRacer = racer;
        }
        
        // Check for leading distance
        const distance = position.progress * 2000; // 2000m total race
        if (distance > leadingDistance) {
          leadingDistance = distance;
          leadingRacer = racer;
        }
      }
    });

    speedDisplay.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      border-radius: 12px;
      padding: 16px;
      min-width: 150px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      text-align: center;
      display: block;
    `;

    speedDisplay.innerHTML = `
      <div style="color: #fff; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid rgba(255, 255, 255, 0.3); padding-bottom: 6px;">
        TOP SPEED
      </div>
      <div style="color: #ffd700; font-size: 32px; font-weight: bold; margin-bottom: 4px;">
        ${maxSpeed}
      </div>
      <div style="color: #fff; font-size: 16px; margin-bottom: 8px;">
        km/h
      </div>
      <div style="color: ${fastestRacer?.color || '#ff69b4'}; font-size: 12px; font-weight: bold; margin-bottom: 12px;">
        ${fastestRacer?.name || 'N/A'}
      </div>
      <div style="color: #fff; font-size: 14px; margin-bottom: 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 4px;">
        LEADER
      </div>
      <div style="color: #00ff00; font-size: 24px; font-weight: bold; margin-bottom: 4px;">
        ${Math.round(leadingDistance)}m
      </div>
      <div style="color: ${leadingRacer?.color || '#ff69b4'}; font-size: 12px; font-weight: bold;">
        ${leadingRacer?.name || 'N/A'}
      </div>
    `;
  }

  // Draw the race
  drawRace() {
    if (!this.ctx || !this.raceState) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw race track background
    this.drawRaceTrack();
    
    // Draw racing lanes
    this.drawRacingLanes();
    
    // Draw racers
    this.drawRacers();
  }

  // Draw race track background
  drawRaceTrack() {
    // If we have a background image, use it
    if (this.currentBackground && this.currentBackground.complete) {
      // Draw the background image to fill the canvas
      this.ctx.drawImage(this.currentBackground, 0, 0, this.canvas.width, this.canvas.height);
      
      // Add a subtle overlay to make the track more visible
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.fillRect(0, this.canvas.height * 0.6, this.canvas.width, this.canvas.height * 0.4);
      
    } else {
      // Fallback: Simple gradient background
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(0.6, '#F4A460'); // Sandy brown
      gradient.addColorStop(1, '#CD853F'); // Peru
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Draw racing lanes
  drawRacingLanes() {
    const laneWidth = this.canvas.width / 8;
    
    // Draw vertical track lanes
    for (let i = 0; i < 8; i++) {
      const x = i * laneWidth;
      
      // Lane background - alternating colors
      this.ctx.fillStyle = i % 2 === 0 ? 'rgba(139, 69, 19, 0.3)' : 'rgba(160, 82, 45, 0.3)';
      this.ctx.fillRect(x, 0, laneWidth, this.canvas.height);
      
      // Lane borders (vertical lines) - REMOVED
      // this.ctx.strokeStyle = 'rgba(101, 67, 33, 0.8)';
      // this.ctx.lineWidth = 2;
      // this.ctx.beginPath();
      // this.ctx.moveTo(x, 0);
      // this.ctx.lineTo(x, this.canvas.height);
      // this.ctx.stroke();
    }
  }

  // Draw racers
  drawRacers() {
    if (!this.raceState) return;
    
    const laneWidth = this.canvas.width / 8; // Divide canvas into 8 vertical lanes
    const raceHeight = this.canvas.height - 60; // Use full height minus small margin
    const finishLineY = 0; // Characters should cross completely through to the very top edge
    const startingY = this.canvas.height - 40; // Starting Y position at bottom
    
    // Update animation frame counter for switching between frames
    this.animationFrame++;
    
    this.raceState.racers.forEach((racer, index) => {
      const position = this.raceState.positions[racer.id];
      if (!position) return;
      
      // Calculate perspective trajectory
      const progress = position.progress; // 0 to 1
      
      // Starting position: characters start with more space between them
      const startingSpread = 500; // Maximum starting formation for excellent spacing
      const startCenterX = this.canvas.width / 2;
      const startLaneWidth = startingSpread / this.raceState.racers.length;
      const startLaneX = startCenterX - (startingSpread / 2) + (index * startLaneWidth) + (startLaneWidth / 2);
      
      // Ending position: characters finish very close together at the center
      const finishCenterX = this.canvas.width / 2;
      const finishSpread = 40; // Wider finish spread for better visibility
      const charactersCount = this.raceState.racers.length;
      const finishLaneWidth = finishSpread / charactersCount;
      const finishX = finishCenterX - (finishSpread / 2) + (index * finishLaneWidth) + (finishLaneWidth / 2);
      
      // Calculate current position with perspective convergence
      const currentX = startLaneX + (finishX - startLaneX) * Math.min(progress, 1);
      
      // Characters move from BOTTOM to TOP of the canvas
      const finishY = 0; // Top of the canvas
      const beyondFinishY = -20; // Well past the top (negative = above canvas)
      
      let currentY;
      if (progress <= 0.85) {
        // Phase 1: Move from start to near the top
        currentY = startingY - (progress / 0.85) * (startingY - 30);
      } else if (progress <= 1.0) {
        // Phase 2: Cross through the top of the canvas
        const crossProgress = (progress - 0.85) / 0.15;
        currentY = 30 - crossProgress * (30 - beyondFinishY);
      } else {
        // Phase 3: Continue past the top (for races that go beyond 100%)
        const extraProgress = progress - 1.0;
        currentY = beyondFinishY - (extraProgress * 40);
      }
      
      // Scale characters smaller so they can run closer together without overlapping
      const baseCharacterWidth = 70;   // Reduced from 100 for tighter spacing
      const baseCharacterHeight = 90;  // Reduced from 130 for tighter spacing
      const scaleFactor = 1.0 - (Math.min(progress, 1) * 0.5); // Less scaling reduction (0.5 instead of 0.6)
      const characterWidth = baseCharacterWidth * scaleFactor;
      const characterHeight = baseCharacterHeight * scaleFactor;
      
      // Get character frames for animation
      const characterFrames = this.characterFrames.get(racer.id);
      let characterImg = null;
      
      if (characterFrames) {
        // Animate between frame1 and frame2 for running effect
        // Switch frames every 10 animation cycles (faster animation for better running effect)
        const frameSwitch = Math.floor(this.animationFrame / 10) % 2;
        
        if (this.raceState.isRunning) {
          // ONLY use running frames when race is running - NO FACE IMAGES!
          if (frameSwitch === 0 && characterFrames.frame1) {
            characterImg = characterFrames.frame1;
          } else if (frameSwitch === 1 && characterFrames.frame2) {
            characterImg = characterFrames.frame2;
          } else {
            // If one frame is missing, use the available running frame
            characterImg = characterFrames.frame1 || characterFrames.frame2;
          }
        } else {
          // When not running, use frame1 as idle pose (still a running frame, not face)
          characterImg = characterFrames.frame1 || characterFrames.frame2;
        }
      } else {
        // Fallback to old system only if no frames loaded
        characterImg = this.characterImages.get(racer.id);
      }
      
      // Draw character with perspective positioning and scaling
      if (characterImg && characterImg.complete) {
        // Add subtle shadow for depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        this.ctx.shadowBlur = 8 * scaleFactor;
        this.ctx.shadowOffsetX = 2 * scaleFactor;
        this.ctx.shadowOffsetY = 4 * scaleFactor;
        
        // Draw character sprite with perspective scaling
        this.ctx.drawImage(
          characterImg, 
          currentX - characterWidth/2, 
          currentY - characterHeight/2, 
          characterWidth, 
          characterHeight
        );
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Add character name below character (also scaled)
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${16 * scaleFactor}px Arial`; // Increased from 12
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3 * scaleFactor;
        this.ctx.strokeText(racer.name, currentX, currentY + characterHeight/2 + 20 * scaleFactor); // Increased spacing
        this.ctx.fillText(racer.name, currentX, currentY + characterHeight/2 + 20 * scaleFactor);
        
      } else {
        // Fallback: smaller colored circle for tighter spacing
        this.ctx.fillStyle = racer.color;
        this.ctx.beginPath();
        this.ctx.arc(currentX, currentY, 18 * scaleFactor, 0, 2 * Math.PI); // Reduced from 25 to 18
        this.ctx.fill();
        
        // White border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2 * scaleFactor; // Reduced from 3 to 2
        this.ctx.stroke();
        
        // Character initial
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${14 * scaleFactor}px Arial`; // Reduced from 18 to 14
        this.ctx.textAlign = 'center';
        this.ctx.fillText(racer.name.charAt(0), currentX, currentY + 5 * scaleFactor);
        
        // Character name below
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${10 * scaleFactor}px Arial`; // Reduced from 12 to 10
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2 * scaleFactor; // Reduced from 3 to 2
        this.ctx.strokeText(racer.name, currentX, currentY + 35 * scaleFactor); // Reduced from 45 to 35
        this.ctx.fillText(racer.name, currentX, currentY + 35 * scaleFactor);
      }
    });
  }

  // Update positions display
  updatePositionsDisplay() {
    const positionsDisplay = document.getElementById('positionsDisplay');
    if (!positionsDisplay || !this.raceState) return;
    
    const sortedRacers = [...this.raceState.racers].sort((a, b) => {
      return this.raceState.positions[a.id].position - this.raceState.positions[b.id].position;
    });
    
    positionsDisplay.innerHTML = '<h3 style="color: #FFD700; margin: 0 0 10px 0;">POSITIONS</h3>';
    sortedRacers.forEach((racer) => {
      const position = this.raceState.positions[racer.id];
      const progressPercent = (position.progress * 100).toFixed(1);
      
      const div = document.createElement('div');
      div.style.cssText = `
        color: white;
        font-size: 14px;
        margin: 4px 0;
        padding: 4px 8px;
        background: rgba(0,0,0,0.5);
        border-left: 3px solid ${racer.color};
        border-radius: 4px;
      `;
      div.textContent = `${position.position}. ${racer.name} (${progressPercent}%)`;
      positionsDisplay.appendChild(div);
    });
  }

  // Update speed display
  updateSpeedDisplay() {
    const speedDisplay = document.getElementById('speedDisplay');
    if (!speedDisplay || !this.raceState) return;
    
    let topSpeed = 0;
    this.raceState.racers.forEach(racer => {
      const position = this.raceState.positions[racer.id];
      if (position && position.speed > topSpeed) {
        topSpeed = position.speed;
      }
    });
    
    speedDisplay.innerHTML = `
      <h3 style="color: #FFD700; margin: 0 0 10px 0;">TOP SPEED</h3>
      <div style="color: #00FF00; font-size: 24px; font-weight: bold;">
        ${(topSpeed * 8).toFixed(0)} km/h
      </div>
    `;
  }

  // Handle race end
  handleRaceEnd(data) {
    console.log('🏁 Race ended:', data);
    
    if (this.raceState) {
      this.raceState.isRunning = false;
    }
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Show winner
    if (this.raceState) {
      const winner = [...this.raceState.racers].sort((a, b) => {
        return this.raceState.positions[b.id].progress - this.raceState.positions[a.id].progress;
      })[0];
      
      if (winner) {
        // Add a small delay to ensure race animation completes
        setTimeout(() => {
          this.showWinner(winner);
        }, 500);
      }
    }
  }

  // Show winner
  showWinner(winner) {
    console.log('🏆 Showing winner:', winner);
    
    // Show the winner modal using UI if available
    if (this.ui && this.ui.showWinnerModal) {
      // Use the character's avatar or face image
      let characterImage = 'images/characters/hana-face.png'; // fallback
      
      if (winner.avatar) {
        // Use the avatar from the character data
        characterImage = winner.avatar;
      } else if (winner.name) {
        // Fallback to face image based on name
        const characterName = winner.name.toLowerCase();
        characterImage = `images/characters/${characterName}-face.png`;
      }
      
      // Prepare winner data for the modal
      const winnerData = {
        name: winner.name,
        image: characterImage,
        totalPot: '20.00 SOL ($3305.60)', // You can get this from race data
        yourBet: '0.00 SOL ($0.00)',
        winnings: '+0.00 SOL ($0.00)',
        netResult: '+0.00 SOL ($0.00)'
      };
      
      this.ui.showWinnerModal(winnerData);
      
      // Auto-close the modal after 10 seconds (optional)
      setTimeout(() => {
        if (this.ui.hideWinnerModal) {
          this.ui.hideWinnerModal();
        }
      }, 10000);
      
    } else {
      // Fallback to the old method if UI is not available
      const winnerDisplay = document.getElementById('winnerDisplay');
      if (winnerDisplay) {
        winnerDisplay.innerHTML = `
          <div style="text-align: center; color: white; padding: 30px; background: rgba(0,0,0,0.9); border-radius: 12px; border: 3px solid ${winner.color};">
            <h2 style="color: ${winner.color}; margin: 0 0 10px 0; font-size: 32px;">🏆 WINNER! 🏆</h2>
            <h3 style="margin: 10px 0; font-size: 24px;">${winner.name}</h3>
            <p style="font-size: 16px;">Congratulations!</p>
          </div>
        `;
        winnerDisplay.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
          winnerDisplay.style.display = 'none';
        }, 5000);
      }
    }
  }

  // Add any missing methods that might be called
  updateRaceProgress(data) {
    // Handle real-time race updates if needed
    console.log('Race progress update:', data);
  }

  // Update the updateDistributionLegend method in bettingClient.js with better styling
  updateDistributionLegend(data) {
    const distributionLegend = document.querySelector('.distribution-legend');
    if (!distributionLegend) {
      console.warn('Distribution legend element not found');
      return;
    }
    
    distributionLegend.innerHTML = '';
    
    // Sort by percentage (highest first) and filter out 0%
    const sortedData = Object.entries(data)
      .filter(([racerId, raceData]) => raceData.percentage > 0)
      .sort(([,a], [,b]) => b.percentage - a.percentage)
      .slice(0, 6); // Show top 6
    
    sortedData.forEach(([racerId, raceData]) => {
      const racer = this.racers.find(r => r.id == racerId);
      if (!racer) return;
      
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        margin: 4px 0;
        background: linear-gradient(135deg, rgba(30, 30, 40, 0.9), rgba(45, 45, 55, 0.9));
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
        min-height: 40px;
      `;
      
      // Left side container
      const leftSide = document.createElement('div');
      leftSide.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      `;
      
      // Color dot
      const colorDot = document.createElement('div');
      colorDot.style.cssText = `
        width: 12px;
        height: 12px;
        background: ${racer.color || '#ff69b4'};
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 8px ${racer.color}40;
      `;
      
      // Character image
      const imageContainer = document.createElement('div');
      imageContainer.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid ${racer.color || '#ff69b4'};
        flex-shrink: 0;
        background: ${racer.color || '#ff69b4'}20;
      `;
      
      const img = document.createElement('img');
      img.src = racer.avatar || `images/characters/${racer.name.toLowerCase()}-face.png`;
      img.alt = racer.name;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      
      img.onerror = () => {
        imageContainer.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background: ${racer.color || '#ff69b4'};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${racer.name.charAt(0).toUpperCase()}</div>
        `;
      };
      
      imageContainer.appendChild(img);
      
      // Character name
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = `
        color: white;
        font-size: 14px;
        font-weight: 600;
        flex: 1;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      `;
      nameSpan.textContent = racer.name;
      
      // Right side container
      const rightSide = document.createElement('div');
      rightSide.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      `;
      
      // Percentage
      const percentSpan = document.createElement('span');
      percentSpan.style.cssText = `
        color: ${racer.color || '#ff69b4'};
        font-size: 16px;
        font-weight: bold;
        text-shadow: 0 0 8px ${racer.color}60;
      `;
      percentSpan.textContent = `${raceData.percentage.toFixed(1)}%`;
      
      // Odds (calculated from percentage)
      const odds = (100 / raceData.percentage).toFixed(2);
      const oddsSpan = document.createElement('span');
      oddsSpan.style.cssText = `
        color: #9ca3af;
        font-size: 11px;
        font-weight: 500;
      `;
      oddsSpan.textContent = `${odds}x`;
      
      // Assemble the legend item
      leftSide.appendChild(colorDot);
      leftSide.appendChild(imageContainer);
      leftSide.appendChild(nameSpan);
      
      rightSide.appendChild(percentSpan);
      rightSide.appendChild(oddsSpan);
      
      legendItem.appendChild(leftSide);
      legendItem.appendChild(rightSide);
      
      // Add hover effect
      legendItem.addEventListener('mouseenter', () => {
        legendItem.style.background = `linear-gradient(135deg, rgba(40, 40, 50, 0.9), rgba(55, 55, 65, 0.9))`;
        legendItem.style.transform = 'translateY(-2px)';
        legendItem.style.boxShadow = `0 4px 12px ${racer.color}30`;
      });
      
      legendItem.addEventListener('mouseleave', () => {
        legendItem.style.background = 'linear-gradient(135deg, rgba(30, 30, 40, 0.9), rgba(45, 45, 55, 0.9))';
        legendItem.style.transform = 'translateY(0)';
        legendItem.style.boxShadow = 'none';
      });
      
      distributionLegend.appendChild(legendItem);
    });
    
    console.log(`✅ Updated distribution legend with ${sortedData.length} items`);
  }
}
