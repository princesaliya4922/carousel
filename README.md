# Swipix

A lightweight, feature-rich carousel/slider library for modern web applications.

## Overview

Swipix is a customizable carousel library that offers a wide range of features including infinite looping, responsive layouts, touch gestures, built-in tab support, autoplay, lazy loading, and more. It's designed to be flexible and easy to implement in any web project.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration Options](#configuration-options)
- [Features](#features)
  - [Responsive Design](#responsive-design)
  - [Infinite Loop](#infinite-loop)
  - [Touch & Mouse Interaction](#touch--mouse-interaction)
  - [Built-in Tabs](#built-in-tabs)
  - [Autoplay](#autoplay)
  - [Lazy Loading](#lazy-loading)
  - [Lazy Initialization](#lazy-initialization)
- [API Methods](#api-methods)
- [Events](#events)
- [Examples](#examples)
- [Browser Support](#browser-support)
- [License](#license)

## Installation

### Direct script include

```html
<script src="https://unpkg.com/swipix/dist/swipix.umd.js"></script>
```

## Basic Usage

1. Create the HTML structure for your carousel:

```html
<div class="pix-container">
  <div class="pix-wrapper">
    <div class="pix-slide">Slide 1</div>
    <div class="pix-slide">Slide 2</div>
    <div class="pix-slide">Slide 3</div>
    <!-- More slides -->
  </div>
</div>

<!-- Optional Navigation Buttons -->
<button class="prev-btn">Previous</button>
<button class="next-btn">Next</button>
```

2. Initialize the carousel with JavaScript:

```javascript
const carousel = new Swipix({
  container: '.pix-container',
  nextButton: '.next-btn',
  prevButton: '.prev-btn'
}).init();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | String | `.pix-container` | Selector for the carousel container |
| `nextButton` | String/null | `null` | Selector for the next button |
| `prevButton` | String/null | `null` | Selector for the previous button |
| `loop` | Boolean | `false` | Enable standard looping (return to first/last slide) |
| `infiniteLoop` | Boolean | `false` | Enable true infinite sliding with cloned slides |
| `speed` | Number | `300` | Transition speed in milliseconds |
| `slidesPerView` | Object | `{ default: 1 }` | Number of slides to show based on viewport width |
| `gap` | Number | `0` | Gap between slides in pixels |
| `slidesToMove` | Number | `1` | Number of slides to move per navigation action |
| `tabsConfig` | Object/Array | `undefined` | Configuration for built-in tabs |
| `autoplay` | Object | `{ enabled: false, delay: 3000, pauseOnInteraction: false, pauseAfterInteraction: false }` | Autoplay configuration |
| `lazyMedia` | Boolean | `false` | When true, media inside slides (img/video with data-src) will be lazy loaded when visible |
| `lazyMediaOffset` | Number | `100` | Offset in pixels for triggering lazy media load |
| `lazyPix` | Boolean | `false` | When true, initializes the carousel only when it's near the viewport |
| `lazyPixOffset` | Number | `150` | Offset in pixels for lazy initialization |

### Responsive Configuration

The `slidesPerView` option accepts an object with breakpoints:

```javascript
slidesPerView: {
  default: 1, // Default value for mobile
  768: 2,     // 2 slides when viewport width >= 768px
  1024: 3     // 3 slides when viewport width >= 1024px
}
```

## Features

### Responsive Design

Swipix automatically adapts to different screen sizes with the configurable `slidesPerView` option. This allows you to display different numbers of slides based on the viewport width.

```javascript
const carousel = new Swipix({
  container: '.pix-container',
  slidesPerView: {
    default: 1, // Mobile view
    768: 2,     // Tablet view
    1024: 3     // Desktop view
  }
}).init();
```

### Infinite Loop

Swipix offers two loop options:

1. **Standard Loop** (`loop: true`): When you reach the end, clicking "next" will take you back to the first slide.

2. **Infinite Loop** (`infiniteLoop: true`): Creates a true infinite loop by cloning slides, providing a seamless and continuous experience.

```javascript
// True infinite carousel with cloned slides
const infiniteCarousel = new Swipix({
  container: '.pix-container',
  infiniteLoop: true
}).init();
```

### Touch & Mouse Interaction

Swipix includes built-in support for touch swipe and mouse drag interactions. Users can navigate slides with touch or mouse gestures without any additional configuration.

### Built-in Tabs

Swipix supports integrated tabs for navigating between slides. This is particularly useful for creating tab-controlled content carousels.

```javascript
const carouselWithTabs = new Swipix({
  container: '.pix-container',
  tabsConfig: {
    container: '.tabs-container',
    buttonSelector: '.tab-btn',
    activeClass: 'active'
  }
}).init();
```

#### Advanced Tab Configuration

You can map specific tabs to specific slides:

```javascript
tabsConfig: {
  container: '.tabs-container',
  buttonSelector: '.tab-btn',
  mapping: [0, 3, 5], // First tab -> slide 0, second tab -> slide 3, etc.
  activeClass: 'active'
}
```

You can also use range mapping to activate tabs based on slide ranges:

```javascript
tabsConfig: {
  container: '.tabs-container',
  buttonSelector: '.tab-btn',
  mapping: [0, 3], // If slide index < 3, activate first tab, otherwise second tab
  rangeMapping: true,
  activeClass: 'active'
}
```

Multiple tab groups can be configured by providing an array of tab configurations:

```javascript
tabsConfig: [
  {
    container: '.tabs-container-1',
    buttonSelector: '.tab-btn-1'
  },
  {
    container: '.tabs-container-2',
    buttonSelector: '.tab-btn-2',
    mapping: [0, 3, 5]
  }
]
```

### Autoplay

Swipix includes configurable autoplay functionality:

```javascript
const autoplayCarousel = new Swipix({
  container: '.pix-container',
  autoplay: {
    enabled: true,
    delay: 3000,               // Time between slides in milliseconds
    pauseOnInteraction: true,  // Pause when user interacts with carousel
    pauseAfterInteraction: false // Don't resume after user interaction
  }
}).init();
```

### Lazy Loading

Swipix supports lazy loading of media content within slides:

```javascript
const lazyCarousel = new Swipix({
  container: '.pix-container',
  lazyMedia: true,
  lazyMediaOffset: 100 // Load media when slides are 100px from entering the viewport
}).init();
```

To use lazy loading, add a `data-src` attribute to your media elements instead of `src`:

```html
<div class="pix-slide">
  <img data-src="image.jpg" alt="Lazy loaded image">
</div>
```

### Lazy Initialization

For performance optimization, Swipix can initialize the carousel only when it's near the viewport:

```javascript
const lazyInitCarousel = new Swipix({
  container: '.pix-container',
  lazyPix: true,
  lazyPixOffset: 150 // Initialize when carousel is 150px from entering the viewport
}).init();
```

## API Methods

Swipix provides several methods to control the carousel programmatically:

### `init([selector])`

Initializes the carousel. Optionally accepts a container selector.

```javascript
const carousel = new Swipix(config).init();
// or
const carousel = new Swipix(config).init('#my-carousel');
```

### `next(container)`

Navigate to the next slide.

```javascript
carousel.next('.pix-container');
```

### `prev(container)`

Navigate to the previous slide.

```javascript
carousel.prev('.pix-container');
```

### `slideTo(container, index)`

Navigate to a specific slide by index (zero-based).

```javascript
carousel.slideTo('.pix-container', 2); // Go to the third slide
```

If you have only one carousel, you can simplify:

```javascript
carousel.slideTo(2); // Go to the third slide of the first carousel
```

### `updateConfig(newConfig)`

Update carousel configuration after initialization.

```javascript
carousel.updateConfig({
  speed: 500,
  gap: 20,
  autoplay: { enabled: true, delay: 5000 }
});
```

### `destroy()`

Completely removes the carousel functionality and reverts to the original HTML structure.

```javascript
carousel.destroy();
```

## Events

Swipix emits events that you can listen for:

### `swipix:slideChanged`

Fired when the active slide changes.

```javascript
document.addEventListener('swipix:slideChanged', (event) => {
  console.log('Slide changed:', event.detail.currentIndex);
});
```

The event detail contains:
- `carousel`: The Swipix instance
- `container`: The carousel container element
- `currentIndex`: The current slide index

## Examples

### Basic Carousel

```javascript
const basicCarousel = new Swipix({
  container: '#basic-carousel',
  nextButton: '.next-btn',
  prevButton: '.prev-btn'
}).init();
```

### Infinite Loop with Multiple Visible Slides

```javascript
const infiniteCarousel = new Swipix({
  container: '#infinite-carousel',
  nextButton: '.next-btn',
  prevButton: '.prev-btn',
  infiniteLoop: true,
  slidesPerView: { default: 1, 768: 2, 1024: 3 },
  gap: 10
}).init();
```

### Carousel with Tabs

```javascript
const tabCarousel = new Swipix({
  container: '#tab-carousel',
  tabsConfig: {
    container: '.tabs-container',
    buttonSelector: '.tab-btn',
    activeClass: 'active'
  }
}).init();
```

### Autoplay Carousel with Lazy Loading

```javascript
const autoplayLazyCarousel = new Swipix({
  container: '#autoplay-lazy-carousel',
  autoplay: { enabled: true, delay: 3000, pauseOnInteraction: true },
  lazyMedia: true
}).init();
```

## Browser Support

Swipix works in all modern browsers that support:
- ES6 features
- CSS3 transitions
- IntersectionObserver API (for lazy loading features)

## License

MIT License