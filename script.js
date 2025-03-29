/**
 * PCarousel - A customizable carousel library
 */
class PCarousel {
  /**
   * Create a new carousel instance
   * @param {Object} config - Configuration options
   * @param {string} config.container - Selector for the carousel container
   * @param {string|null} config.nextButton - Selector for next button (null for no button)
   * @param {string|null} config.prevButton - Selector for previous button (null for no button)
   * @param {boolean} config.loop - Enable infinite sliding
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
      currentIndex: 0
    };
    
    this.state.carousels.push(carouselData);
    
    // Apply initial styles
    this._applyStyles(carouselData);
    
    // Calculate slide dimensions
    this._calculateDimensions(carouselData);
    
    // Initialize navigation if specified
    this._initNavigation(carouselData);
    
    // Add touch support
    this._initTouchEvents(carouselData);
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
    carouselData.totalSlides = slides.length;
    
    // Set slide widths
    slides.forEach(slide => {
      slide.style.width = `${carouselData.slideWidth}px`;
    });
    
    // Store the gap value for position calculations
    carouselData.gap = this.config.gap;
    
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
   * Initialize touch events for swipe functionality
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _initTouchEvents(carouselData) {
    const { container, wrapper } = carouselData;
    let startX, moveX, touchStarted = false;
    
    // Touch start
    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      touchStarted = true;
      
      // Disable transition during touch
      wrapper.style.transition = 'none';
    }, { passive: true });
    
    // Touch move
    container.addEventListener('touchmove', (e) => {
      if (!touchStarted) return;
      
      moveX = e.touches[0].clientX;
      const diff = moveX - startX;
      
      // Get current transform value
      const currentTransform = carouselData.currentIndex * carouselData.slideWidth;
      wrapper.style.transform = `translateX(${-currentTransform + diff}px)`;
    }, { passive: true });
    
    // Touch end
    container.addEventListener('touchend', () => {
      if (!touchStarted) return;
      
      // Re-enable transition
      wrapper.style.transition = `transform ${this.config.speed}ms ease`;
      
      const diff = moveX - startX;
      
      // If swipe distance is enough, move to next or previous
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          this.prev(container);
        } else {
          this.next(container);
        }
      } else {
        // Reset to current position
        this._positionSlides(carouselData);
      }
      
      touchStarted = false;
    });
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
    
    const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
    // Get how many slides to move
    const slidesToMove = this.config.slidesToMove;
    
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
    
    this._positionSlides(carouselData);
    
    // Reset animation flag after transition is complete
    setTimeout(() => {
      carouselData.isAnimating = false;
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
    
    this._positionSlides(carouselData);
    
    // Reset animation flag after transition is complete
    setTimeout(() => {
      carouselData.isAnimating = false;
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
    
    // Ensure index is within bounds
    if (index < 0) {
      carouselData.currentIndex = 0;
    } else if (index > maxIndex) {
      carouselData.currentIndex = maxIndex;
    } else {
      carouselData.currentIndex = index;
    }
    
    this._positionSlides(carouselData);
    
    // Reset animation flag after transition is complete
    setTimeout(() => {
      carouselData.isAnimating = false;
    }, this.config.speed);
    
    return this;
  }

  /**
   * Update carousel configuration
   * @param {Object} newConfig - New configuration options
   * @returns {PCarousel} - Returns the carousel instance for chaining
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    // Reinitialize carousels with new config
    this.state.carousels.forEach(carouselData => {
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
      const { container, wrapper, slides } = carouselData;
      
      // Remove styles
      container.style.overflow = '';
      container.style.position = '';
      
      wrapper.style.display = '';
      wrapper.style.transition = '';
      wrapper.style.transform = '';
      wrapper.style.willChange = '';
      
      slides.forEach(slide => {
        slide.style.flexShrink = '';
        slide.style.width = '';
      });
      
      // Remove event listeners (this is a simplified approach)
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