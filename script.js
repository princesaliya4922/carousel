/**
 * Swipix - A customizable carousel library
 * Enhanced with infiniteLoop, built-in tabs support, and range-mapped tabs.
 */
class Swipix {
  /**
   * Create a new carousel instance
   * @param {Object} config - Configuration options
   * @param {string} config.container - Selector for the carousel container (default: '.pix-container')
   * @param {string|null} config.nextButton - Selector for next button (null for no button)
   * @param {string|null} config.prevButton - Selector for previous button (null for no button)
   * @param {boolean} config.loop - Enable standard looping (has no effect when infiniteLoop is true)
   * @param {boolean} config.infiniteLoop - Enable true infinite sliding with cloned slides
   * @param {number} config.speed - Transition speed in milliseconds
   * @param {Object} config.slidesPerView - Number of slides to show based on viewport (e.g., { default: 1, 768: 2, 1024: 3 })
   * @param {number} config.gap - Gap between slides in pixels
   * @param {number} config.slidesToMove - Number of slides to move per navigation action
   * @param {Object} [config.tabsConfig] - Optional configuration for tab buttons
   *    Example:
   *    {
   *      container: '.tabs-container',
   *      buttonSelector: '.tab-btn', // optional
   *      mapping: [0, 4],            // optional (with rangeMapping, mapping array sets thresholds)
   *      rangeMapping: true,         // optional: if true, mapping values are treated as thresholds
   *      activeClass: 'active'       // optional
   *    }
   */
  constructor(config) {
    // Default configuration
    this.config = {
      container: '.pix-container',
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
   * @returns {Swipix} - Returns the carousel instance for chaining
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
    const wrapper = container.querySelector('.pix-wrapper');
    const slides = container.querySelectorAll('.pix-slide');
    
    if (!wrapper || slides.length === 0) {
      console.error('Carousel structure is invalid. Make sure you have .pix-wrapper and .pix-slide elements.');
      return;
    }
    
    // Convert NodeList to Array and assign an index attribute to each real slide
    const originalSlides = Array.from(slides).map((slide, index) => {
      slide.setAttribute('data-swipix-index', index);
      return slide;
    });
    
    const carouselData = {
      container,
      wrapper,
      slides: Array.from(slides),
      originalSlides, // Store original slides for reference
      currentIndex: 0,
      isInfinite: this.config.infiniteLoop,
      clonedSlides: [], // Track cloned slides
      realSlidesOffset: 0 // Offset for the real slides when using infiniteLoop
    };
    
    this.state.carousels.push(carouselData);
    
    // Apply initial styles and functionality
    this._applyStyles(carouselData);
    
    // Setup infinite loop if enabled
    if (this.config.infiniteLoop) {
      this._setupInfiniteLoop(carouselData);
    }
    
    // Calculate dimensions and position slides
    this._calculateDimensions(carouselData);
    
    // Initialize navigation buttons
    this._initNavigation(carouselData);
    
    // Initialize touch/drag events
    this._initTouchEvents(carouselData);
    
    // Initialize tabs if configured
    if (this.config.tabsConfig && this.config.tabsConfig.container) {
      this._initTabs(carouselData);
    }
  }

  /**
   * Initialize tab buttons functionality based on tabsConfig
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _initTabs(carouselData) {
    const tabsConf = this.config.tabsConfig;
    const tabsContainer = document.querySelector(tabsConf.container);
    if (!tabsContainer) {
      console.warn(`Tabs container not found for selector ${tabsConf.container}`);
      return;
    }
    
    let buttons;
    if (tabsConf.buttonSelector) {
      buttons = tabsContainer.querySelectorAll(tabsConf.buttonSelector);
    } else {
      buttons = tabsContainer.children;
    }
    buttons = Array.from(buttons);
    
    // Save tabs info in carouselData for later use
    carouselData.tabsConfig = tabsConf;
    carouselData.tabsContainer = tabsContainer;
    carouselData.tabButtons = buttons;
    
    // Attach click events for each tab button
    buttons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        // Determine target slide from mapping if provided, else use button index
        let targetSlide = tabsConf.mapping && Array.isArray(tabsConf.mapping) 
                          ? tabsConf.mapping[index]
                          : index;
        if (targetSlide < 0 || targetSlide >= carouselData.totalSlides) {
          console.warn(`Mapping for tab index ${index} is out-of-bound.`);
          return;
        }
        this.slideTo(carouselData.container, targetSlide);
      });
    });
    
    // Set initial active tab
    this._updateTabsActive(carouselData);
  }

  /**
   * Update the active state of tab buttons based on the current slide
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _updateTabsActive(carouselData) {
    if (!carouselData.tabsConfig || !carouselData.tabButtons) return;
    
    let activeIndex = carouselData.currentIndex;
    if (carouselData.isInfinite) {
      activeIndex = carouselData.currentIndex - carouselData.realSlidesOffset;
    }
    activeIndex = Math.max(0, Math.min(activeIndex, carouselData.totalSlides - 1));
    
    const tabsConf = carouselData.tabsConfig;
    const activeClass = tabsConf.activeClass || 'active';
    
    // If rangeMapping is enabled, use mapping thresholds to determine active tab.
    if (tabsConf.rangeMapping && Array.isArray(tabsConf.mapping) && tabsConf.mapping.length > 0) {
      let selectedTab = 0;
      for (let i = 0; i < tabsConf.mapping.length; i++) {
        if (activeIndex >= tabsConf.mapping[i]) {
          selectedTab = i;
        }
      }
      carouselData.tabButtons.forEach((btn, i) => {
        if (i === selectedTab) {
          btn.classList.add(activeClass);
        } else {
          btn.classList.remove(activeClass);
        }
      });
    } else {
      // Default (non-range): either use mapping equality or identity mapping.
      carouselData.tabButtons.forEach((btn, i) => {
        let mappedSlide = tabsConf.mapping && Array.isArray(tabsConf.mapping)
                          ? tabsConf.mapping[i]
                          : i;
        if (mappedSlide === activeIndex) {
          btn.classList.add(activeClass);
        } else {
          btn.classList.remove(activeClass);
        }
      });
    }
  }

  /**
   * Setup infinite loop by cloning slides and positioning them
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _setupInfiniteLoop(carouselData) {
    const { wrapper, originalSlides } = carouselData;
    
    // Clear any existing clones to avoid duplicates
    this._clearClonedSlides(carouselData);
    
    const breakpointValues = Object.values(this.config.slidesPerView);
    const maxSlidesPerView = Math.max(...breakpointValues);
    const cloneCount = maxSlidesPerView + this.config.slidesToMove;
    
    // Clone beginning slides and append to the end
    const beginClones = [];
    for (let i = 0; i < cloneCount; i++) {
      const slideIndex = i % originalSlides.length;
      const clone = originalSlides[slideIndex].cloneNode(true);
      clone.setAttribute('data-swipix-clone', 'end');
      clone.setAttribute('data-swipix-original-index', slideIndex);
      wrapper.appendChild(clone);
      beginClones.push(clone);
    }
    
    // Clone ending slides and prepend to the beginning
    const endClones = [];
    for (let i = 0; i < cloneCount; i++) {
      const slideIndex = (originalSlides.length - 1 - i) % originalSlides.length;
      const clone = originalSlides[slideIndex].cloneNode(true);
      clone.setAttribute('data-swipix-clone', 'start');
      clone.setAttribute('data-swipix-original-index', slideIndex);
      wrapper.insertBefore(clone, wrapper.firstChild);
      endClones.push(clone);
    }
    
    carouselData.clonedSlides = [...endClones, ...beginClones];
    carouselData.realSlidesOffset = endClones.length;
    carouselData.slides = Array.from(wrapper.querySelectorAll('.pix-slide'));
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
    carouselData.slides = [...carouselData.originalSlides];
  }

  /**
   * Apply necessary styles to carousel elements
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _applyStyles(carouselData) {
    const { container, wrapper, slides } = carouselData;
    container.style.overflow = 'hidden';
    container.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.transition = `transform ${this.config.speed}ms ease`;
    wrapper.style.willChange = 'transform';
    
    slides.forEach(slide => {
      slide.style.flexShrink = '0';
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
    const viewportWidth = window.innerWidth;
    
    let slidesPerView = this.config.slidesPerView.default;
    const breakpoints = Object.keys(this.config.slidesPerView)
      .filter(bp => bp !== 'default')
      .map(bp => parseInt(bp, 10))
      .sort((a, b) => b - a);
    
    for (const bp of breakpoints) {
      if (viewportWidth >= bp) {
        slidesPerView = this.config.slidesPerView[bp];
        break;
      }
    }
    
    carouselData.slidesPerView = slidesPerView;
    carouselData.containerWidth = container.offsetWidth;
    const totalGapSpace = this.config.gap * (slidesPerView - 1);
    carouselData.slideWidth = (carouselData.containerWidth - totalGapSpace) / slidesPerView;
    carouselData.totalSlides = carouselData.originalSlides.length;
    
    slides.forEach(slide => {
      slide.style.width = `${carouselData.slideWidth}px`;
    });
    
    carouselData.gap = this.config.gap;
    if (carouselData.isInfinite) {
      this._setupInfiniteLoop(carouselData);
    }
    this._positionSlides(carouselData);
  }

  /**
   * Position slides based on the current index
   * @param {Object} carouselData - Data for a specific carousel
   * @private
   */
  _positionSlides(carouselData) {
    const { wrapper, currentIndex, slideWidth, gap } = carouselData;
    const translateX = -currentIndex * (slideWidth + gap);
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
    const endThreshold = realSlidesOffset + totalSlides;
    if (currentIndex < realSlidesOffset) {
      wrapper.style.transition = 'none';
      carouselData.currentIndex = endThreshold - (realSlidesOffset - currentIndex);
      this._positionSlides(carouselData);
      void wrapper.offsetWidth;
      wrapper.style.transition = `transform ${this.config.speed}ms ease`;
    } else if (currentIndex >= endThreshold) {
      wrapper.style.transition = 'none';
      carouselData.currentIndex = realSlidesOffset + (currentIndex - endThreshold);
      this._positionSlides(carouselData);
      void wrapper.offsetWidth;
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
    if (this.config.nextButton) {
      const nextBtn = container.querySelector(this.config.nextButton) || document.querySelector(this.config.nextButton);
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.next(container);
        });
      }
    }
    if (this.config.prevButton) {
      const prevBtn = container.querySelector(this.config.prevButton) || document.querySelector(this.config.prevButton);
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
    
    const handleDragStart = (e) => {
      const targetTag = e.target.tagName.toLowerCase();
      if (['input', 'button', 'select', 'textarea'].includes(targetTag)) return;
      e.preventDefault();
      startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      isDragging = true;
      const transform = window.getComputedStyle(wrapper).getPropertyValue('transform');
      const matrix = new DOMMatrix(transform);
      initialTransform = matrix.m41;
      wrapper.style.transition = 'none';
      wrapper.style.cursor = 'grabbing';
    };
    
    const handleDragMove = (e) => {
      if (!isDragging) return;
      moveX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const diff = moveX - startX;
      let adjustedDiff = diff;
      if (!carouselData.isInfinite && !this.config.loop) {
        const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
        if (carouselData.currentIndex === 0 && diff > 0) adjustedDiff = diff * 0.3;
        if (carouselData.currentIndex === maxIndex && diff < 0) adjustedDiff = diff * 0.3;
      }
      wrapper.style.transform = `translateX(${initialTransform + adjustedDiff}px)`;
    };
    
    const handleDragEnd = (e) => {
      if (!isDragging) return;
      wrapper.style.transition = `transform ${this.config.speed}ms ease`;
      wrapper.style.cursor = 'grab';
      const endX = e.type === 'touchend' ? (e.changedTouches ? e.changedTouches[0].clientX : moveX) : e.clientX || moveX;
      const diff = endX - startX;
      const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
      const isAtStart = carouselData.currentIndex === (carouselData.isInfinite ? carouselData.realSlidesOffset : 0);
      const isAtEnd = carouselData.currentIndex === (carouselData.isInfinite ? carouselData.realSlidesOffset + maxIndex : maxIndex);
      if (Math.abs(diff) > 50) {
        if (diff > 0 && (!isAtStart || this.config.loop || carouselData.isInfinite)) {
          this.prev(container);
        } else if (diff < 0 && (!isAtEnd || this.config.loop || carouselData.isInfinite)) {
          this.next(container);
        } else {
          this._positionSlides(carouselData);
        }
      } else {
        this._positionSlides(carouselData);
      }
      isDragging = false;
      const event = new CustomEvent('swipix:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    };
    
    container.addEventListener('touchstart', handleDragStart, { passive: false });
    container.addEventListener('touchmove', handleDragMove, { passive: true });
    container.addEventListener('touchend', handleDragEnd);
    container.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    wrapper.style.cursor = 'grab';
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
   * @returns {Swipix} - Returns the carousel instance for chaining
   */
  next(container) {
    const carouselData = this._getCarouselData(container);
    if (!carouselData || carouselData.isAnimating) return this;
    carouselData.isAnimating = true;
    const slidesToMove = this.config.slidesToMove;
    if (carouselData.isInfinite) {
      carouselData.currentIndex += slidesToMove;
    } else {
      const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
      if (carouselData.currentIndex + slidesToMove > maxIndex) {
        if (this.config.loop) {
          carouselData.currentIndex = 0;
        } else {
          carouselData.currentIndex = maxIndex;
          carouselData.isAnimating = false;
          return this;
        }
      } else {
        carouselData.currentIndex += slidesToMove;
      }
    }
    this._positionSlides(carouselData);
    if (carouselData.isInfinite) {
      setTimeout(() => {
        this._checkInfiniteLoopReset(carouselData);
      }, this.config.speed);
    }
    setTimeout(() => {
      carouselData.isAnimating = false;
      this._updateTabsActive(carouselData);
      const event = new CustomEvent('swipix:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    }, this.config.speed);
    return this;
  }

  /**
   * Move to the previous slide
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {Swipix} - Returns the carousel instance for chaining
   */
  prev(container) {
    const carouselData = this._getCarouselData(container);
    if (!carouselData || carouselData.isAnimating) return this;
    carouselData.isAnimating = true;
    const slidesToMove = this.config.slidesToMove;
    if (carouselData.isInfinite) {
      carouselData.currentIndex -= slidesToMove;
    } else {
      if (carouselData.currentIndex - slidesToMove < 0) {
        if (this.config.loop) {
          carouselData.currentIndex = carouselData.totalSlides - carouselData.slidesPerView;
        } else {
          carouselData.currentIndex = 0;
          carouselData.isAnimating = false;
          return this;
        }
      } else {
        carouselData.currentIndex -= slidesToMove;
      }
    }
    this._positionSlides(carouselData);
    if (carouselData.isInfinite) {
      setTimeout(() => {
        this._checkInfiniteLoopReset(carouselData);
      }, this.config.speed);
    }
    setTimeout(() => {
      carouselData.isAnimating = false;
      this._updateTabsActive(carouselData);
      const event = new CustomEvent('swipix:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    }, this.config.speed);
    return this;
  }

  /**
   * Go to a specific slide by index (zero-based for real slides)
   * @param {HTMLElement|string} container - Container element or selector
   * @param {number} index - Target slide index (zero-based for real slides)
   * @returns {Swipix} - Returns the carousel instance for chaining
   */
  goTo(container, index) {
    const carouselData = this._getCarouselData(container);
    if (!carouselData || carouselData.isAnimating) return this;
    carouselData.isAnimating = true;
    const maxIndex = carouselData.totalSlides - carouselData.slidesPerView;
    let targetIndex = index;
    if (carouselData.isInfinite) {
      targetIndex = index + carouselData.realSlidesOffset;
    }
    if (targetIndex < (carouselData.isInfinite ? carouselData.realSlidesOffset : 0)) {
      carouselData.currentIndex = carouselData.isInfinite ? carouselData.realSlidesOffset : 0;
    } else if (targetIndex > (carouselData.isInfinite ? carouselData.realSlidesOffset + maxIndex : maxIndex)) {
      carouselData.currentIndex = carouselData.isInfinite ? carouselData.realSlidesOffset + maxIndex : maxIndex;
    } else {
      carouselData.currentIndex = targetIndex;
    }
    this._positionSlides(carouselData);
    setTimeout(() => {
      carouselData.isAnimating = false;
      if (carouselData.isInfinite) {
        this._checkInfiniteLoopReset(carouselData);
      }
      this._updateTabsActive(carouselData);
      const event = new CustomEvent('swipix:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    }, this.config.speed);
    return this;
  }
  
  /**
   * Slide to a specific slide by index (zero-based for real slides)
   * @param {HTMLElement|string|number} container - Container element/selector or index if single carousel
   * @param {number} [index] - Target slide index if container is provided
   * @returns {Swipix} - Returns the carousel instance for chaining
   */
  slideTo(container, index) {
    if (typeof container === 'number') {
      index = container;
      container = this.state.carousels[0].container;
    }
    const carouselData = this._getCarouselData(container);
    if (!carouselData || carouselData.isAnimating) return this;
    carouselData.isAnimating = true;
    const totalRealSlides = carouselData.totalSlides;
    const targetRealIndex = Math.max(0, Math.min(index, totalRealSlides - 1));
    let targetIndex = targetRealIndex;
    if (carouselData.isInfinite) {
      targetIndex = targetRealIndex + carouselData.realSlidesOffset;
    }
    carouselData.currentIndex = targetIndex;
    this._positionSlides(carouselData);
    if (carouselData.isInfinite) {
      setTimeout(() => {
        this._checkInfiniteLoopReset(carouselData);
      }, this.config.speed);
    }
    setTimeout(() => {
      carouselData.isAnimating = false;
      this._updateTabsActive(carouselData);
      const event = new CustomEvent('swipix:slideChanged', { 
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex } 
      });
      document.dispatchEvent(event);
    }, this.config.speed);
    return this;
  }

  /**
   * Update carousel configuration
   * @param {Object} newConfig - New configuration options
   * @returns {Swipix} - Returns the carousel instance for chaining
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    const infiniteLoopChanged = oldConfig.infiniteLoop !== this.config.infiniteLoop;
    
    this.state.carousels.forEach(carouselData => {
      if (infiniteLoopChanged) {
        carouselData.isInfinite = this.config.infiniteLoop;
        if (carouselData.isInfinite) {
          this._setupInfiniteLoop(carouselData);
        } else {
          this._clearClonedSlides(carouselData);
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
      
      if (this.config.tabsConfig && this.config.tabsConfig.container) {
        this._initTabs(carouselData);
      }
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
      if (carouselData.isInfinite) {
        this._clearClonedSlides(carouselData);
      }
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
      if (eventHandlers) {
        container.removeEventListener('touchstart', eventHandlers.handleDragStart, { passive: false });
        container.removeEventListener('touchmove', eventHandlers.handleDragMove, { passive: true });
        container.removeEventListener('touchend', eventHandlers.handleDragEnd);
        container.removeEventListener('mousedown', eventHandlers.handleDragStart);
        window.removeEventListener('mousemove', eventHandlers.handleDragMove);
        window.removeEventListener('mouseup', eventHandlers.handleDragEnd);
      }
      const newContainer = container.cloneNode(true);
      container.parentNode.replaceChild(newContainer, container);
    });
    this.state.carousels = [];
  }
}

// Export the library
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Swipix;
} else {
  window.Swipix = Swipix;
}
