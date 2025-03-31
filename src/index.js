/**
 * Swipix - A customizable carousel library
 * Supports infinite looping, built-in tabs (with optional range mapping and multiple tab groups),
 * autoplay with pause on interaction, media lazy loading, and lazy initialization (lazyPix).
 */
class Swipix {
  /**
   * Create a new carousel instance.
   * @param {Object} config - Configuration options.
   * @param {string} config.container - Selector for the carousel container (default: '.pix-container')
   * @param {string|null} config.nextButton - Selector for next button (null for no button)
   * @param {string|null} config.prevButton - Selector for previous button (null for no button)
   * @param {boolean} config.loop - Enable standard looping (has no effect when infiniteLoop is true)
   * @param {boolean} config.infiniteLoop - Enable true infinite sliding with cloned slides
   * @param {number} config.speed - Transition speed in milliseconds
   * @param {Object} config.slidesPerView - Number of slides to show based on viewport (e.g., { default: 1, 768: 2, 1024: 3 })
   * @param {number} config.gap - Gap between slides in pixels
   * @param {number} config.slidesToMove - Number of slides to move per navigation action
   * @param {Object|Array} [config.tabsConfig] - Optional configuration for tab buttons.
   * @param {Object} [config.autoplay] - Autoplay configuration: { enabled: true, delay: 3000, pauseOnInteraction: true, pauseAfterInteraction: false }
   * @param {boolean} [config.lazyMedia] - When true, media inside slides (img/video with data-src) will be lazy loaded when visible.
   * @param {number} [config.lazyMediaOffset] - Offset in pixels for triggering lazy media load (default: 100).
   * @param {boolean} [config.lazyPix] - When true, the carousel will not initialize until its container is near the viewport.
   * @param {number} [config.lazyPixOffset] - Offset in pixels used with IntersectionObserver to trigger lazy initialization (default: 150).
   * @param {boolean} [config.dynamicHeight] - When true and slidesPerView is 1, container height adjusts to active slide.
   * @param {number} [config.dynamicHeightBottomOffset] - Extra bottom offset (in pixels) added to the container height.
   */
  constructor(config) {
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
      autoplay: { enabled: false, delay: 3000, pauseOnInteraction: false, pauseAfterInteraction: false },
      lazyMedia: false,
      lazyMediaOffset: 100,
      lazyPix: false,
      lazyPixOffset: 150,
      dynamicHeight: false, // New: Enable dynamic height adjustment.
      dynamicHeightBottomOffset: 0, // New: Additional bottom offset in pixels.
      ...config
    };

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

  init(containerSelector = null) {
    const selector = containerSelector || this.config.container;
    const containers = document.querySelectorAll(selector);

    containers.forEach(container => {
      if (this.config.lazyPix) {
        this._observeInit(container);
      } else {
        this._initSingleCarousel(container);
      }
    });
    window.addEventListener('resize', this._handleResize.bind(this));
    if (this.config.autoplay.enabled) {
      this.state.carousels.forEach(carouselData => {
        this._setupAutoplay(carouselData);
      });
    }
    return this;
  }

  _observeInit(container) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this._initSingleCarousel(container);
          observer.unobserve(container);
        }
      });
    }, { threshold: 0, rootMargin: `${this.config.lazyPixOffset}px` });
    observer.observe(container);
  }

  _initSingleCarousel(container) {
    const wrapper = container.querySelector('.pix-wrapper');
    const slides = container.querySelectorAll('.pix-slide');
    if (!wrapper || slides.length === 0) {
      console.error('Carousel structure is invalid. Ensure you have .pix-wrapper and .pix-slide elements.');
      return;
    }
    if (this.config.infiniteLoop) {
      container.style.visibility = 'hidden';
    }
    const originalSlides = Array.from(slides).map((slide, index) => {
      slide.setAttribute('data-swipix-index', index);
      return slide;
    });
    const carouselData = {
      container,
      wrapper,
      slides: Array.from(slides),
      originalSlides,
      currentIndex: 0,
      isInfinite: this.config.infiniteLoop,
      clonedSlides: [],
      realSlidesOffset: 0,
      autoplayInterval: null,
      autoplayHandlers: null,
      tabGroups: [],
      isVisible: false
    };
    this.state.carousels.push(carouselData);
    this._applyStyles(carouselData);
    if (this.config.infiniteLoop) {
      this._setupInfiniteLoop(carouselData);
    }
    this._calculateDimensions(carouselData);
    carouselData.wrapper.style.transition = 'none';
    this._positionSlides(carouselData);
    void carouselData.wrapper.offsetWidth;
    carouselData.wrapper.style.transition = `transform ${this.config.speed}ms ease`;
    if (this.config.infiniteLoop) {
      container.style.visibility = 'visible';
    }
    this._initNavigation(carouselData);
    this._initTouchEvents(carouselData);
    if (this.config.tabsConfig) {
      this._initTabsGroups(carouselData);
    }
    if (this.config.lazyMedia) {
      this._observeVisibility(carouselData);
    }
    if (this.config.autoplay.enabled && this.config.autoplay.pauseOnInteraction) {
      const pauseHandler = () => {
        this._pauseAutoplay(carouselData);
        if (this.config.autoplay.pauseAfterInteraction) {
          carouselData.container.removeEventListener('mouseleave', resumeHandler);
        }
      };
      const resumeHandler = () => {
        if (!this.config.autoplay.pauseAfterInteraction) {
          this._startAutoplay(carouselData);
        }
      };
      carouselData.autoplayHandlers = { pauseHandler, resumeHandler };
      container.addEventListener('mouseenter', pauseHandler);
      container.addEventListener('mouseleave', resumeHandler);
    }

    // Add a listener for the slide changed event to update lazy media
    document.addEventListener('swipix:slideChanged', (event) => {
      if (event.detail.container === carouselData.container && this.config.lazyMedia && carouselData.isVisible) {
        this._lazyLoadMedia(carouselData);
      }
    });
  }

  _observeVisibility(carouselData) {
    const container = carouselData.container;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        carouselData.isVisible = entry.isIntersecting;
        if (entry.isIntersecting && this.config.lazyMedia) {
          // Use a small timeout to ensure DOM is ready
          setTimeout(() => {
            this._lazyLoadMedia(carouselData);
          }, 10);
        }
      });
    }, { 
      threshold: [0, 0.1, 0.5, 1], // Add multiple thresholds to detect partial visibility
      rootMargin: `${this.config.lazyMediaOffset}px` 
    });
    observer.observe(container);
    carouselData.visibilityObserver = observer;
  }

  _setupAutoplay(carouselData) {
    this._startAutoplay(carouselData);
  }

  _startAutoplay(carouselData) {
    this._pauseAutoplay(carouselData);
    carouselData.autoplayInterval = setInterval(() => {
      this.next(carouselData.container);
    }, this.config.autoplay.delay);
  }

  _pauseAutoplay(carouselData) {
    clearInterval(carouselData.autoplayInterval);
    carouselData.autoplayInterval = null;
  }

  _lazyLoadMedia(carouselData) {
    if (!carouselData.isVisible) return;
    
    const { container, wrapper, slides, slideWidth, gap, currentIndex } = carouselData;
    
    // Calculate the current visible area
    const containerRect = container.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Check each slide to see if it's visible or partially visible
    slides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect();
      
      // Check if the slide is at least partially visible in the container
      const isVisible = !(
        slideRect.right <= containerRect.left || 
        slideRect.left >= containerRect.right
      );
      
      if (isVisible) {
        // Process images
        const imgs = slide.querySelectorAll('img[data-src]');
        imgs.forEach(img => {
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc && !img.getAttribute('src')) {
            img.setAttribute('src', dataSrc);
            img.removeAttribute('data-src');
          }
        });
        
        // Process videos
        const videos = slide.querySelectorAll('video');
        videos.forEach(video => {
          if (video.hasAttribute('data-src')) {
            const dataSrc = video.getAttribute('data-src');
            if (dataSrc && !video.getAttribute('src')) {
              video.setAttribute('src', dataSrc);
              video.removeAttribute('data-src');
              video.load();
            }
          } else {
            const sources = video.querySelectorAll('source[data-src]');
            let updated = false;
            sources.forEach(source => {
              const dataSrc = source.getAttribute('data-src');
              if (dataSrc && !source.getAttribute('src')) {
                source.setAttribute('src', dataSrc);
                source.removeAttribute('data-src');
                updated = true;
              }
            });
            if (updated) {
              video.load();
            }
          }
        });
      }
    });
  }

  _initTabsGroups(carouselData) {
    const tabsConfigOption = this.config.tabsConfig;
    let tabConfigs = [];
    if (Array.isArray(tabsConfigOption)) {
      tabConfigs = tabsConfigOption;
    } else if (tabsConfigOption && typeof tabsConfigOption === 'object') {
      tabConfigs = [tabsConfigOption];
    } else {
      return;
    }
    carouselData.tabGroups = [];
    tabConfigs.forEach(config => {
      const tabsContainer = document.querySelector(config.container);
      if (!tabsContainer) {
        console.warn(`Tabs container not found for selector ${config.container}`);
        return;
      }
      let buttons;
      if (config.buttonSelector) {
        buttons = tabsContainer.querySelectorAll(config.buttonSelector);
      } else {
        buttons = tabsContainer.children;
      }
      buttons = Array.from(buttons);
      buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
          let targetSlide = config.mapping && Array.isArray(config.mapping)
            ? config.mapping[index]
            : index;
          if (targetSlide < 0 || targetSlide >= carouselData.totalSlides) {
            console.warn(`Mapping for tab index ${index} is out-of-bound.`);
            return;
          }
          this.slideTo(carouselData.container, targetSlide);
        });
      });
      carouselData.tabGroups.push({ container: tabsContainer, buttons, config });
      this._updateTabsActiveGroup(carouselData, config, buttons);
    });
  }

  _updateTabsActive(carouselData) {
    if (!carouselData.tabGroups) return;
    carouselData.tabGroups.forEach(group => {
      this._updateTabsActiveGroup(carouselData, group.config, group.buttons);
    });
  }

  _updateTabsActiveGroup(carouselData, config, buttons) {
    let activeIndex = carouselData.currentIndex;
    if (carouselData.isInfinite) {
      activeIndex = carouselData.currentIndex - carouselData.realSlidesOffset;
    }
    activeIndex = Math.max(0, Math.min(activeIndex, carouselData.totalSlides - 1));
    const activeClass = config.activeClass || 'active';
    if (config.rangeMapping && Array.isArray(config.mapping) && config.mapping.length > 0) {
      let selectedTab = 0;
      for (let i = 0; i < config.mapping.length; i++) {
        if (activeIndex >= config.mapping[i]) {
          selectedTab = i;
        }
      }
      buttons.forEach((btn, i) => {
        if (i === selectedTab) {
          btn.classList.add(activeClass);
        } else {
          btn.classList.remove(activeClass);
        }
      });
    } else {
      buttons.forEach((btn, i) => {
        let mappedSlide = config.mapping && Array.isArray(config.mapping)
          ? config.mapping[i]
          : i;
        if (mappedSlide === activeIndex) {
          btn.classList.add(activeClass);
        } else {
          btn.classList.remove(activeClass);
        }
      });
    }
  }

  _setupInfiniteLoop(carouselData) {
    const { wrapper, originalSlides } = carouselData;
    this._clearClonedSlides(carouselData);
    const breakpointValues = Object.values(this.config.slidesPerView);
    const maxSlidesPerView = Math.max(...breakpointValues);
    const cloneCount = maxSlidesPerView;
    const beginClones = [];
    for (let i = 0; i < cloneCount; i++) {
      const slideIndex = i % originalSlides.length;
      const clone = originalSlides[slideIndex].cloneNode(true);
      clone.setAttribute('data-swipix-clone', 'end');
      clone.setAttribute('data-swipix-original-index', slideIndex);
      wrapper.appendChild(clone);
      beginClones.push(clone);
    }
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

  _calculateDimensions(carouselData) {
    const { container, slides } = carouselData;
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
    // If dynamicHeight is enabled and only one slide is visible, adjust container height.
    if (this.config.dynamicHeight && slidesPerView === 1) {
      this._adjustContainerHeight(carouselData);
    } else {
      container.style.height = '';
    }
  }

  // NEW: Adjust container height based on active slide, including borders, container paddings, and additional bottom offset.
  _adjustContainerHeight(carouselData) {
    const { container, slides, currentIndex } = carouselData;
    const activeSlide = slides[currentIndex];
    if (activeSlide) {
      // Get active slide content height.
      const slideContentHeight = activeSlide.scrollHeight;
      // Get border widths of active slide.
      const slideStyle = window.getComputedStyle(activeSlide);
      const borderTop = parseFloat(slideStyle.borderTopWidth) || 0;
      const borderBottom = parseFloat(slideStyle.borderBottomWidth) || 0;
      // Get container padding (top and bottom).
      const containerStyle = window.getComputedStyle(container);
      const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(containerStyle.paddingBottom) || 0;
      // Get additional bottom offset.
      const bottomOffset = parseFloat(this.config.dynamicHeightBottomOffset) || 0;
      // Calculate total height.
      const totalHeight = slideContentHeight + borderTop + borderBottom + paddingTop + paddingBottom + bottomOffset;
      container.style.height = totalHeight + 'px';
    }
  }

  _positionSlides(carouselData) {
    const { wrapper, currentIndex, slideWidth, gap } = carouselData;
    const translateX = -currentIndex * (slideWidth + gap);
    wrapper.style.transform = `translateX(${translateX}px)`;
    if (this.config.lazyMedia && carouselData.isVisible) {
      this._lazyLoadMedia(carouselData);
    }
    // NEW: Adjust container height if dynamicHeight is enabled and only one slide is visible.
    if (this.config.dynamicHeight && carouselData.slidesPerView === 1) {
      this._adjustContainerHeight(carouselData);
    }
  }

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

  _initNavigation(carouselData) {
    const { container } = carouselData;
    if (this.config.nextButton) {
      const nextBtn = container.querySelector(this.config.nextButton) || document.querySelector(this.config.nextButton);
      if (nextBtn) {
        nextBtn.addEventListener('click', () => { this.next(container); });
      }
    }
    if (this.config.prevButton) {
      const prevBtn = container.querySelector(this.config.prevButton) || document.querySelector(this.config.prevButton);
      if (prevBtn) {
        prevBtn.addEventListener('click', () => { this.prev(container); });
      }
    }
  }

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
      const endX = e.type === 'touchend'
        ? (e.changedTouches ? e.changedTouches[0].clientX : moveX)
        : e.clientX || moveX;
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
    carouselData.eventHandlers = { handleDragStart, handleDragMove, handleDragEnd };
  }

  _handleResize() {
    this.state.carousels.forEach(carouselData => {
      this._calculateDimensions(carouselData);
    });
  }

  _getCarouselData(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    return this.state.carousels.find(data => data.container === container) || null;
  }

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
      setTimeout(() => { this._checkInfiniteLoopReset(carouselData); }, this.config.speed);
    }
    setTimeout(() => {
      carouselData.isAnimating = false;
      this._updateTabsActive(carouselData);
      const event = new CustomEvent('swipix:slideChanged', {
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex }
      });

      // Add this inside the setTimeout callback of next(), prev() and slideTo()
      if (this.config.lazyMedia && carouselData.isVisible) {
        this._lazyLoadMedia(carouselData);
      }

      document.dispatchEvent(event);
    }, this.config.speed);

    
    return this;
  }

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
      setTimeout(() => { this._checkInfiniteLoopReset(carouselData); }, this.config.speed);
    }
    setTimeout(() => {
      carouselData.isAnimating = false;
      this._updateTabsActive(carouselData);
      const event = new CustomEvent('swipix:slideChanged', {
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex }
      });

      // Add this inside the setTimeout callback of next(), prev() and slideTo()
      if (this.config.lazyMedia && carouselData.isVisible) {
        this._lazyLoadMedia(carouselData);
      }

      document.dispatchEvent(event);
    }, this.config.speed);
    return this;
  }

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
      setTimeout(() => { this._checkInfiniteLoopReset(carouselData); }, this.config.speed);
    }
    setTimeout(() => {
      carouselData.isAnimating = false;
      this._updateTabsActive(carouselData);
      const event = new CustomEvent('swipix:slideChanged', {
        detail: { carousel: this, container, currentIndex: carouselData.currentIndex }
      });
      // Add this inside the setTimeout callback of next(), prev() and slideTo()
      if (this.config.lazyMedia && carouselData.isVisible) {
        this._lazyLoadMedia(carouselData);
      }
      document.dispatchEvent(event);
    }, this.config.speed);
    return this;
  }

  updateConfig(newConfig) {
    if (newConfig.autoplay) {
      this.config.autoplay = {
        enabled: newConfig.autoplay.enabled !== undefined ? newConfig.autoplay.enabled : this.config.autoplay.enabled,
        delay: newConfig.autoplay.delay !== undefined ? newConfig.autoplay.delay : this.config.autoplay.delay,
        pauseOnInteraction: newConfig.autoplay.pauseOnInteraction !== undefined ? newConfig.autoplay.pauseOnInteraction : this.config.autoplay.pauseOnInteraction,
        pauseAfterInteraction: newConfig.autoplay.pauseAfterInteraction !== undefined ? newConfig.autoplay.pauseAfterInteraction : this.config.autoplay.pauseAfterInteraction
      };
      delete newConfig.autoplay;
    }
    this.config = { ...this.config, ...newConfig };
    this.state.carousels.forEach(carouselData => {
      if (this.config.infiniteLoop !== carouselData.isInfinite) {
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
      if (this.config.tabsConfig) {
        this._initTabsGroups(carouselData);
      }
      this._pauseAutoplay(carouselData);
      if (this.config.autoplay.enabled) {
        this._startAutoplay(carouselData);
      }
      if (this.config.autoplay.enabled && this.config.autoplay.pauseOnInteraction) {
        if (carouselData.autoplayHandlers) {
          carouselData.container.removeEventListener('mouseenter', carouselData.autoplayHandlers.pauseHandler);
          carouselData.container.removeEventListener('mouseleave', carouselData.autoplayHandlers.resumeHandler);
        }
        if (this.config.autoplay.pauseAfterInteraction) {
          const pauseHandler = () => {
            this._pauseAutoplay(carouselData);
            carouselData.container.removeEventListener('mouseleave', resumeHandler);
          };
          const resumeHandler = () => {};
          carouselData.autoplayHandlers = { pauseHandler, resumeHandler };
          carouselData.container.addEventListener('mouseenter', pauseHandler);
        } else {
          const pauseHandler = () => this._pauseAutoplay(carouselData);
          const resumeHandler = () => this._startAutoplay(carouselData);
          carouselData.autoplayHandlers = { pauseHandler, resumeHandler };
          carouselData.container.addEventListener('mouseenter', pauseHandler);
          carouselData.container.addEventListener('mouseleave', resumeHandler);
        }
      }
    });
    return this;
  }

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Swipix;
} else {
  window.Swipix = Swipix;
}
