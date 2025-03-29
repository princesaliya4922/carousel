/**
 * PCarousel - A customizable carousel library
 * Enhanced with infiniteLoop functionality
 */
class PCarousel {
  /**
   * Create a new carousel instance
   * @param {Object} config - Configuration options
   * @param {string} config.container - Selector for the carousel container
   * @param {string|null} config.nextButton - Selector for next button (null for no button)
   * @param {string|null} config.prevButton - Selector for previous button (null for no button)
   * @param {boolean} config.loop - Enable standard looping (has no effect when infiniteLoop is true)
   * @param {boolean} config.infiniteLoop - Enable true infinite sliding with cloned slides
   * @param {number} config.speed - Transition speed in milliseconds
   * @param {Object} config.slidesPerView - Number of slides to show based on viewport
   *    Example: { default: 1, 768: 2, 1024: 3 }
   * @param {number} config.gap - Gap between slides in pixels
   * @param {number} config.slidesToMove - Number of slides to move per navigation action
   */
  constructor(config) {
    // Default configuration
    this.config = {
      container: '.pcar-container',
      nextButton: null,
      prevButton: null,
      loop: false,
      infiniteLoop: false,
      speed: 300,
      slidesPerView: { default: 1 },
      gap: 0,
      slidesToMove: 1,
      ...config
    };
    
    // Internal state
    this.state = {
      currentIndex: 0,
      totalSlides: 0,
      slideWidth: 0,
      isAnimating: false,
      containerWidth: 0,
      slidesPerView: 1,
      carousels: []
    };
  }

  /**
   * Initialize the carousel
   * @param {string} containerSelector - Optional container selector to override config
   * @returns {PCarousel} - Returns the carousel instance for chaining
   */
  init(containerSelector = null) {
    const selector = containerSelector || this.config.container;
    const containers = document.querySelectorAll(selector);
    
    containers.forEach(container => {
      this._initSingleCarousel(container);
    });
    
    window.addEventListener('resize', this._handleResize.bind(this));
    
    return this;
  }

  /**
   * Initialize a single carousel container
   * @param {HTMLElement} container - The carousel container element
   * @private
   */
  _initSingleCarousel(container) {
    const wrapper = container.querySelector('.pcar-wrapper');
    const slides = container.querySelectorAll('.pcar-slides');
    
    if (!wrapper || slides.length === 0) {
      console.error('Carousel structure is invalid. Make sure you have .pcar-wrapper and .pcar-slides elements.');
      return;
    }
    
    const carouselData = {
      container,
      wrapper,
      slides: Array.from(slides),
      originalSlides: Array.from(slides), // Store original slides for reference
      currentIndex: 0,
      isInfinite: this.config.infiniteLoop,
      clonedSlides: [], // Track cloned slides
      realSlidesOffset: 0 // Offset for the real slides when using infiniteLoop
    };
    
    this.state.carousels.push(carouselData);
    
    // Apply initial styles
    this._applyStyles(carouselData);
    
    // Handle infinite loop setup if enabled
    if (this.config.infiniteLoop) {
      this._setupInfiniteLoop(carouselData);
    }
    
    // Calculate slide dimensions
    this._calculateDimensions(carouselData);
    
    // Initialize navigation if specified
    this._initNavigation(carouselData);
    
    // Add touch support
    this._initTouchEvents(carouselData);
  }

  /**
   * Setup infinite loop by cloning slides and positioning them
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _setupInfiniteLoop(carouselData) {
    const { wrapper, slides, originalSlides } = carouselData;
    
    // First, clear any existing clones to avoid duplicates on reinit
    this._clearClonedSlides(carouselData);
    
    // Determine how many slides to clone based on slidesPerView
    // We'll get the maximum possible slidesPerView value from all breakpoints
    const breakpointValues = Object.values(this.config.slidesPerView);
    const maxSlidesPerView = Math.max(...breakpointValues);
    
    // Clone enough slides to ensure smooth infinite scrolling
    // We need at least maxSlidesPerView slides at each end
    // Add a buffer of slidesToMove for smoother experience
    const cloneCount = maxSlidesPerView + this.config.slidesToMove;
    
    // Clone beginning slides and append to the end
    const beginClones = [];
    for (let i = 0; i < cloneCount; i++) {
      const slideIndex = i % originalSlides.length;
      const clone = originalSlides[slideIndex].cloneNode(true);
      clone.setAttribute('data-pcar-clone', 'end');
      clone.setAttribute('data-pcar-original-index', slideIndex);
      wrapper.appendChild(clone);
      beginClones.push(clone);
    }
    
    // Clone ending slides and prepend to the beginning
    const endClones = [];
    for (let i = 0; i < cloneCount; i++) {
      const slideIndex = (originalSlides.length - 1 - i) % originalSlides.length;
      const clone = originalSlides[slideIndex].cloneNode(true);
      clone.setAttribute('data-pcar-clone', 'start');
      clone.setAttribute('data-pcar-original-index', slideIndex);
      wrapper.insertBefore(clone, wrapper.firstChild);
      endClones.push(clone);
    }
    
    // Store cloned slides and update the offset
    carouselData.clonedSlides = [...endClones, ...beginClones];
    carouselData.realSlidesOffset = endClones.length;
    
    // Update slides array to include clones
    carouselData.slides = Array.from(wrapper.querySelectorAll('.pcar-slides'));
    
    // Set the initial position to the first real slide (after the clones)
    carouselData.currentIndex = carouselData.realSlidesOffset;
  }

  /**
   * Clear cloned slides from the carousel
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _clearClonedSlides(carouselData) {
    const { wrapper, clonedSlides } = carouselData;
    
    if (clonedSlides && clonedSlides.length) {
      clonedSlides.forEach(clone => {
        if (clone.parentNode === wrapper) {
          wrapper.removeChild(clone);
        }
      });
      
      carouselData.clonedSlides = [];
    }
    
    // Reset slides to original slides
    carouselData.slides = [...carouselData.originalSlides];
  }

  /**
   * Apply necessary styles to carousel elements
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _applyStyles(carouselData) {
    const { container, wrapper, slides } = carouselData;
    
    // Container styles
    container.style.overflow = 'hidden';
    container.style.position = 'relative';
    
    // Wrapper styles
    wrapper.style.display = 'flex';
    wrapper.style.transition = `transform ${this.config.speed}ms ease`;
    wrapper.style.willChange = 'transform';
    
    // Slides styles
    slides.forEach(slide => {
      slide.style.flexShrink = '0';
      
      // Apply gap if configured (as margin-right)
      if (this.config.gap > 0) {
        slide.style.marginRight = `${this.config.gap}px`;
      }
    });
  }

  /**
   * Calculate dimensions for the carousel
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _calculateDimensions(carouselData) {
    const { container, wrapper, slides } = carouselData;
    
    // Get current viewport width
    const viewportWidth = window.innerWidth;
    
    // Determine slides per view based on viewport
    let slidesPerView = this.config.slidesPerView.default;
    
    // Sort breakpoints in descending order
    const breakpoints = Object.keys(this.config.slidesPerView)
      .filter(bp => bp !== 'default')
      .map(bp => parseInt(bp, 10))
      .sort((a, b) => b - a);
    
    // Find the appropriate breakpoint
    for (const breakpoint of breakpoints) {
      if (viewportWidth >= breakpoint) {
        slidesPerView = this.config.slidesPerView[breakpoint];
        break;
      }
    }
    
    carouselData.slidesPerView = slidesPerView;
    carouselData.containerWidth = container.offsetWidth;
    
    // Calculate slide width accounting for gap
    // Total gap space = gap × (slidesPerView - 1)
    const totalGapSpace = this.config.gap * (slidesPerView - 1);
    carouselData.slideWidth = (carouselData.containerWidth - totalGapSpace) / slidesPerView;
    
    // Set total slides count
    // For infinite loop, this is the count of original slides, not including clones
    carouselData.totalSlides = carouselData.originalSlides.length;
    
    // Set slide widths
    slides.forEach(slide => {
      slide.style.width = `${carouselData.slideWidth}px`;
    });
    
    // Store the gap value for position calculations
    carouselData.gap = this.config.gap;
    
    // Check if we need to update infinite loop setup on resize
    if (carouselData.isInfinite) {
      // We might need to add or remove clones based on the new slidesPerView
      this._setupInfiniteLoop(carouselData);
    }
    
    // Position slides initially
    this._positionSlides(carouselData);
  }

  /**
   * Position slides based on current index
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _positionSlides(carouselData) {
    const { wrapper, currentIndex, slideWidth, gap } = carouselData;
    
    // Calculate the translation (including gaps)
    const translateX = -currentIndex * (slideWidth + gap);
    
    // Apply the translation
    wrapper.style.transform = `translateX(${translateX}px)`;
  }

  /**
   * Check if we need to reset position for infinite loop
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _checkInfiniteLoopReset(carouselData) {
    if (!carouselData.isInfinite) return;
    
    const { currentIndex, realSlidesOffset, totalSlides, wrapper } = carouselData;
    
    // Calculate the threshold points for reset
    const endThreshold = realSlidesOffset + totalSlides;
    
    // If we've scrolled past the cloned slides at the start
    if (currentIndex < realSlidesOffset) {
      // Disable transition temporarily
      wrapper.style.transition = 'none';
      
      // Jump to the corresponding real slide from the end
      carouselData.currentIndex = endThreshold - (realSlidesOffset - currentIndex);
      this._positionSlides(carouselData);
      
      // Force browser reflow to make the jump instantaneous
      void wrapper.offsetWidth;
      
      // Re-enable transition
      wrapper.style.transition = `transform ${this.config.speed}ms ease`;
    }
    // If we've scrolled past the cloned slides at the end
    else if (currentIndex >= endThreshold) {
      // Disable transition temporarily
      wrapper.style.transition = 'none';
      
      // Jump to the corresponding real slide from the beginning
      carouselData.currentIndex = realSlidesOffset + (currentIndex - endThreshold);
      this._positionSlides(carouselData);
      
      // Force browser reflow to make the jump instantaneous
      void wrapper.offsetWidth;
      
      // Re-enable transition
      wrapper.style.transition = `transform ${this.config.speed}ms ease`;
    }
  }

  /**
   * Initialize navigation buttons
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _initNavigation(carouselData) {
    const { container } = carouselData;
    
    // Next button
    if (this.config.nextButton) {
      const nextBtn = container.querySelector(this.config.nextButton) || 
                      document.querySelector(this.config.nextButton);
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.next(container);
        });
      }
    }
    
    // Previous button
    if (this.config.prevButton) {
      const prevBtn = container.querySelector(this.config.prevButton) || 
                      document.querySelector(this.config.prevButton);
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          this.prev(container);
        });
      }
    }
  }

  /**
   * Initialize touch and mouse drag events for swipe functionality
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _initTouchEvents(carouselData) {
    const { container, wrapper } = carouselData;
    let startX, moveX, isDragging = false;
    let initialTransform = 0;
    
    // Touch/Mouse start
    const handleDragStart = (e) => {
      e.preventDefault();
      startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      isDragging = true;
      
      // Store the current transform value
      const transform = window.getComputedStyle(wrapper).getPropertyValue('transform');
      const matrix = new DOMMatrix(transform);
      initialTransform = matrix.m41; // Get the X translation value
      
      // Disable transition during drag
      wrapper.style.transition = 'none';
      
      // Add cursor styling for better UX
      wrapper.style.cursor = 'grabbing';
    };
    
    // Touch/Mouse move
    const handleDragMove = (e) => {
      if (!isDragging) return;
      
      moveX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const diff = moveX - startX;
      
      // Determine boundaries based on loop/infiniteLoop mode
      let adjustedDiff = diff;
      
      if (!carouselData.isInfinite && !this.config.loop) {
        const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
        
        // Restrict dragging past the first slide (left boundary)
        if (carouselData.currentIndex === 0 && diff > 0) {
          adjustedDiff = diff * 0.3; // Apply resistance effect
        }
        
        // Restrict dragging past the last slide (right boundary)
        if (carouselData.currentIndex === maxIndex && diff < 0) {
          adjustedDiff = diff * 0.3; // Apply resistance effect
        }
      }
      
      // Apply the translation with boundary limits
      wrapper.style.transform = `translateX(${initialTransform + adjustedDiff}px)`;
    };
    
    // Touch/Mouse end
    const handleDragEnd = (e) => {
      if (!isDragging) return;
      
      // Re-enable transition
      wrapper.style.transition = `transform ${this.config.speed}ms ease`;
      wrapper.style.cursor = 'grab';
      
      const endX = e.type === 'touchend' ? 
        (e.changedTouches ? e.changedTouches[0].clientX : moveX) : 
        e.clientX || moveX;
      
      const diff = endX - startX;
      
      // Check if we're at a boundary and not in loop/infiniteLoop mode
      const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
      const isAtStart = carouselData.currentIndex === (carouselData.isInfinite ? carouselData.realSlidesOffset : 0);
      const isAtEnd = carouselData.currentIndex === (carouselData.isInfinite ? 
        carouselData.realSlidesOffset + maxIndex : maxIndex);
      
      // If swipe distance is enough and we're not at a boundary (or we're in loop/infiniteLoop mode)
      if (Math.abs(diff) > 50) {
        if (diff > 0 && (!isAtStart || this.config.loop || carouselData.isInfinite)) {
          this.prev(container);
        } else if (diff < 0 && (!isAtEnd || this.config.loop || carouselData.isInfinite)) {
          this.next(container);
        } else {
          // Reset to current position if we're at a boundary and not in loop mode
          this._positionSlides(carouselData);
        }
      } else {
        // Reset to current position for small movements
        this._positionSlides(carouselData);
      }
      
      isDragging = false;
      
      // Trigger a custom event for external status updates
      const event = new CustomEvent('pcarousel:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    };
    
    // Add event listeners for touch devices
    container.addEventListener('touchstart', handleDragStart, { passive: false });
    container.addEventListener('touchmove', handleDragMove, { passive: true });
    container.addEventListener('touchend', handleDragEnd);
    
    // Add event listeners for mouse drag
    container.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    
    // Add initial grab cursor
    wrapper.style.cursor = 'grab';
    
    // Store event handlers for cleanup in destroy method
    carouselData.eventHandlers = {
      handleDragStart,
      handleDragMove,
      handleDragEnd
    };
  }

  /**
   * Handle window resize event
   * @private
   */
  _handleResize() {
    this.state.carousels.forEach(carouselData => {
      this._calculateDimensions(carouselData);
    });
  }

  /**
   * Get carousel data for a specific container
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {Object|null} - Carousel data or null if not found
   * @private
   */
  _getCarouselData(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    return this.state.carousels.find(data => data.container === container) || null;
  }

  /**
   * Move to the next slide
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {PCarousel} - Returns the carousel instance for chaining
   */
  next(container) {
    const carouselData = this._getCarouselData(container);
    
    if (!carouselData || carouselData.isAnimating) return this;
    
    carouselData.isAnimating = true;
    
    // Get how many slides to move
    const slidesToMove = this.config.slidesToMove;
    
    if (carouselData.isInfinite) {
      // In infinite loop mode, we can always move forward
      carouselData.currentIndex += slidesToMove;
    } else {
      const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
      
      if (carouselData.currentIndex + slidesToMove > maxIndex) {
        if (this.config.loop) {
          // If loop mode is enabled, go back to the first slide
          carouselData.currentIndex = 0;
        } else {
          // Otherwise, go to the last possible index without exceeding
          carouselData.currentIndex = maxIndex;
          carouselData.isAnimating = false;
          return this;
        }
      } else {
        // Move by configured number of slides
        carouselData.currentIndex += slidesToMove;
      }
    }
    
    this._positionSlides(carouselData);
    
    // Check if we need to reset for infinite loop
    if (carouselData.isInfinite) {
      setTimeout(() => {
        this._checkInfiniteLoopReset(carouselData);
      }, this.config.speed);
    }
    
    // Reset animation flag after transition is complete
    setTimeout(() => {
      carouselData.isAnimating = false;
      
      // Trigger a custom event for external status updates
      const event = new CustomEvent('pcarousel:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    }, this.config.speed);
    
    return this;
  }

  /**
   * Move to the previous slide
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {PCarousel} - Returns the carousel instance for chaining
   */
  prev(container) {
    const carouselData = this._getCarouselData(container);
    
    if (!carouselData || carouselData.isAnimating) return this;
    
    carouselData.isAnimating = true;
    
    // Get how many slides to move
    const slidesToMove = this.config.slidesToMove;
    
    if (carouselData.isInfinite) {
      // In infinite loop mode, we can always move backward
      carouselData.currentIndex -= slidesToMove;
    } else {
      if (carouselData.currentIndex - slidesToMove < 0) {
        if (this.config.loop) {
          // If loop mode is enabled, go to the last slide
          carouselData.currentIndex = carouselData.totalSlides - carouselData.slidesPerView;
        } else {
          // Otherwise, stay at the first slide
          carouselData.currentIndex = 0;
          carouselData.isAnimating = false;
          return this;
        }
      } else {
        // Move back by configured number of slides
        carouselData.currentIndex -= slidesToMove;
      }
    }
    
    this._positionSlides(carouselData);
    
    // Check if we need to reset for infinite loop
    if (carouselData.isInfinite) {
      setTimeout(() => {
        this._checkInfiniteLoopReset(carouselData);
      }, this.config.speed);
    }
    
    // Reset animation flag after transition is complete
    setTimeout(() => {
      carouselData.isAnimating = false;
      
      // Trigger a custom event for external status updates
      const event = new CustomEvent('pcarousel:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    }, this.config.speed);
    
    return this;
  }

  /**
   * Go to a specific slide
   * @param {HTMLElement|string} container - Container element or selector
   * @param {number} index - Target slide index
   * @returns {PCarousel} - Returns the carousel instance for chaining
   */
  goTo(container, index) {
    const carouselData = this._getCarouselData(container);
    
    if (!carouselData || carouselData.isAnimating) return this;
    
    carouselData.isAnimating = true;
    
    const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
    
    // Adjust index for infinite loop to account for cloned slides
    let targetIndex = index;
    if (carouselData.isInfinite) {
      targetIndex = index + carouselData.realSlidesOffset;
    }
    
    // Ensure index is within bounds
    if (targetIndex < (carouselData.isInfinite ? carouselData.realSlidesOffset : 0)) {
      carouselData.currentIndex = carouselData.isInfinite ? carouselData.realSlidesOffset : 0;
    } else if (targetIndex > (carouselData.isInfinite ? 
      carouselData.realSlidesOffset + maxIndex : maxIndex)) {
      carouselData.currentIndex = carouselData.isInfinite ? 
        carouselData.realSlidesOffset + maxIndex : maxIndex;
    } else {
      carouselData.currentIndex = targetIndex;
    }
    
    this._positionSlides(carouselData);
    
    // Reset animation flag after transition is complete
    setTimeout(() => {
      carouselData.isAnimating = false;
      
      // Check for infinite loop reset
      if (carouselData.isInfinite) {
        this._checkInfiniteLoopReset(carouselData);
      }
      
      // Trigger a custom event for external status updates
      const event = new CustomEvent('pcarousel:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    }, this.config.speed);
    
    return this;
  }

  /**
   * Update carousel configuration
   * @param {Object} newConfig - New configuration options
   * @returns {PCarousel} - Returns the carousel instance for chaining
   */
  updateConfig(newConfig) {
    const oldConfig = {...this.config};
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    // Check if infiniteLoop setting changed
    const infiniteLoopChanged = oldConfig.infiniteLoop !== this.config.infiniteLoop;
    
    // Reinitialize carousels with new config
    this.state.carousels.forEach(carouselData => {
      // Update infinite loop state
      if (infiniteLoopChanged) {
        carouselData.isInfinite = this.config.infiniteLoop;
        
        if (carouselData.isInfinite) {
          // If enabling infinite loop, set it up
          this._setupInfiniteLoop(carouselData);
        } else {
          // If disabling infinite loop, clean up cloned slides
          this._clearClonedSlides(carouselData);
          
          // Reset index to appropriate position
          carouselData.currentIndex = Math.min(
            carouselData.currentIndex - carouselData.realSlidesOffset,
            carouselData.totalSlides - carouselData.slidesPerView
          );
          carouselData.currentIndex = Math.max(0, carouselData.currentIndex);
          carouselData.realSlidesOffset = 0;
        }
      }
      
      this._applyStyles(carouselData);
      this._calculateDimensions(carouselData);
    });
    
    return this;
  }

  /**
   * Destroy the carousel instance and clean up event listeners
   */
  destroy() {
    window.removeEventListener('resize', this._handleResize.bind(this));
    
    this.state.carousels.forEach(carouselData => {
      const { container, wrapper, slides, eventHandlers } = carouselData;
      
      // Clear cloned slides if infinite loop was enabled
      if (carouselData.isInfinite) {
        this._clearClonedSlides(carouselData);
      }
      
      // Remove styles
      container.style.overflow = '';
      container.style.position = '';
      
      wrapper.style.display = '';
      wrapper.style.transition = '';
      wrapper.style.transform = '';
      wrapper.style.willChange = '';
      wrapper.style.cursor = '';
      
      slides.forEach(slide => {
        slide.style.flexShrink = '';
        slide.style.width = '';
        slide.style.marginRight = '';
      });
      
      // Properly remove event listeners if available
      if (eventHandlers) {
        container.removeEventListener('touchstart', eventHandlers.handleDragStart, { passive: false });
        container.removeEventListener('touchmove', eventHandlers.handleDragMove, { passive: true });
        container.removeEventListener('touchend', eventHandlers.handleDragEnd);
        
        container.removeEventListener('mousedown', eventHandlers.handleDragStart);
        window.removeEventListener('mousemove', eventHandlers.handleDragMove);
        window.removeEventListener('mouseup', eventHandlers.handleDragEnd);
      }
      
      // For other event listeners that might not be tracked
      const newContainer = container.cloneNode(true);
      container.parentNode.replaceChild(newContainer, container);
    });
    
    // Reset state
    this.state.carousels = [];
  }
}

// Export the carousel class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PCarousel;
} else {
  window.PCarousel = PCarousel;
}