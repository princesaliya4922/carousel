# Swipix Carousel Library Documentation

## Overview

Swipix is a customizable, feature-rich JavaScript carousel library that enables developers to create responsive, touch-enabled slider components with various configuration options. The library supports standard carousel functionality along with advanced features such as infinite looping, tabs integration, and responsive breakpoints.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration Options](#configuration-options)
- [Core Features](#core-features)
  - [Infinite Loop](#infinite-loop)
  - [Standard Loop](#standard-loop)
  - [Responsive Design](#responsive-design)
  - [Touch and Drag Support](#touch-and-drag-support)
  - [Tab Integration](#tab-integration)
- [API Reference](#api-reference)
  - [Methods](#methods)
  - [Events](#events)
- [Examples](#examples)
  - [Basic Carousel](#basic-carousel)
  - [Infinite Loop Carousel](#infinite-loop-carousel)
  - [Tabs Integration](#tabs-integration)
- [Troubleshooting](#troubleshooting)

## Installation

Include the Swipix library in your project:

```html
<script src="path/to/script.js"></script>
```

## Basic Usage

### HTML Structure

```html
<div class="pix-container">
  <div class="pix-wrapper">
    <div class="pix-slide">Slide 1</div>
    <div class="pix-slide">Slide 2</div>
    <div class="pix-slide">Slide 3</div>
    <!-- Add more slides as needed -->
  </div>
  
  <!-- Optional navigation buttons -->
  <button class="prev-btn">Previous</button>
  <button class="next-btn">Next</button>
</div>
```

### JavaScript Initialization

```javascript
const carousel = new Swipix({
  container: '.pix-container',
  nextButton: '.next-btn',
  prevButton: '.prev-btn',
  loop: false,
  infiniteLoop: true,
  speed: 300,
  slidesPerView: {
    default: 1,
    768: 2,
    1024: 3
  },
  gap: 10,
  slidesToMove: 1
}).init();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | String | `.pix-container` | CSS selector for the carousel container |
| `nextButton` | String/null | `null` | CSS selector for the next button |
| `prevButton` | String/null | `null` | CSS selector for the previous button |
| `loop` | Boolean | `false` | Enable standard looping (has no effect when infiniteLoop is true) |
| `infiniteLoop` | Boolean | `false` | Enable true infinite sliding with cloned slides |
| `speed` | Number | `300` | Transition speed in milliseconds |
| `slidesPerView` | Object | `{ default: 1 }` | Number of slides to show based on viewport width breakpoints |
| `gap` | Number | `0` | Gap between slides in pixels |
| `slidesToMove` | Number | `1` | Number of slides to move per navigation action |
| `tabsConfig` | Object | `undefined` | Configuration for tab buttons integration (optional) |

### TabsConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | String | Required | CSS selector for the tabs container |
| `buttonSelector` | String | `container children` | CSS selector for tab buttons within the container |
| `mapping` | Array | `null` | Maps tab indices to slide indices |
| `rangeMapping` | Boolean | `false` | If true, mapping values are treated as thresholds |
| `activeClass` | String | `'active'` | CSS class to apply to active tab |

## Core Features

### Infinite Loop

The infinite loop feature creates a seamless, continuous sliding experience by cloning slides and intelligently repositioning them when edges are reached. This ensures that users can continuously navigate through slides without experiencing jumps or pauses.

```javascript
const infiniteCarousel = new Swipix({
  container: '#carousel',
  infiniteLoop: true,
  // other config options...
}).init();
```

#### Implementation Details

When `infiniteLoop` is enabled:

1. The library clones slides at both ends of the carousel
2. The cloned slides count is determined by `Math.max(...slidesPerView) + slidesToMove`
3. When reaching a cloned section, the carousel instantly (without animation) repositions to the corresponding real slides
4. The transition is seamless and unnoticeable to users

### Standard Loop

When `infiniteLoop` is disabled but `loop` is enabled, the carousel will jump from the last slide to the first (or vice versa) when navigating past the edges.

```javascript
const loopCarousel = new Swipix({
  container: '#carousel',
  loop: true,
  infiniteLoop: false,
  // other config options...
}).init();
```

### Responsive Design

Swipix supports responsive design through breakpoint-based configuration for `slidesPerView`:

```javascript
const responsiveCarousel = new Swipix({
  container: '#carousel',
  slidesPerView: {
    default: 1, // 1 slide on mobile
    768: 2,     // 2 slides on tablets (>= 768px)
    1024: 3     // 3 slides on desktops (>= 1024px)
  },
  // other config options...
}).init();
```

The library automatically adjusts the slide width and layout on window resize events.

### Touch and Drag Support

Swipix provides touch and mouse drag support for intuitive user interaction:

- Touch swipe on mobile devices
- Mouse drag on desktop browsers
- Momentum-based navigation based on swipe/drag speed and distance
- Resistance effect when dragging beyond the first or last slide (non-infinite mode)

### Tab Integration

Swipix offers built-in tab integration, allowing tabs to control the carousel and stay synchronized with the current slide:

```javascript
const tabCarousel = new Swipix({
  container: '#carousel',
  tabsConfig: {
    container: '.tabs-container',
    buttonSelector: '.tab-btn',
    mapping: [0, 4], // Tab 1 -> Slide 0, Tab 2 -> Slide 4
    rangeMapping: true,
    activeClass: 'active'
  },
  // other config options...
}).init();
```

#### Range Mapping Mode

When `rangeMapping` is enabled, the mapping array values are treated as thresholds:
- If current slide index < mapping[1], then tab at index 0 is active
- If current slide index >= mapping[1], then tab at index 1 is active

This is useful for representing sections of slides with a single tab.

## API Reference

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `init([containerSelector])` | Optional container selector | Initialize the carousel |
| `next(container)` | Container element or selector | Move to next slide |
| `prev(container)` | Container element or selector | Move to previous slide |
| `goTo(container, index)` | Container element/selector, target index | Go to a specific slide by index |
| `slideTo(container, index)` | Container/index, optional index | Alternate way to navigate to a specific slide |
| `updateConfig(newConfig)` | New configuration object | Update carousel configuration |
| `destroy()` | None | Destroy carousel instance and clean up events |

#### Method Example Usage

```javascript
// Initialize carousel
const carousel = new Swipix(config).init();

// Navigate to next slide
carousel.next('#carousel');

// Navigate to previous slide
carousel.prev('#carousel');

// Go to specific slide (index starts at 0)
carousel.goTo('#carousel', 3);

// Alternative syntax for going to a specific slide
carousel.slideTo('#carousel', 3);

// Update configuration
carousel.updateConfig({
  infiniteLoop: true,
  speed: 500
});

// Destroy carousel
carousel.destroy();
```

### Events

Swipix dispatches custom events that you can listen for:

| Event | Detail Object | Description |
|-------|--------------|-------------|
| `swipix:slideChanged` | `{ carousel, container, currentIndex }` | Fired when slide transition completes |

#### Event Example Usage

```javascript
document.addEventListener('swipix:slideChanged', (event) => {
  const { carousel, container, currentIndex } = event.detail;
  console.log(`Carousel slide changed to index: ${currentIndex}`);
});
```

## Examples

### Basic Carousel

```html
<div class="pix-container" id="basic-carousel">
  <div class="pix-wrapper">
    <div class="pix-slide">Slide 1</div>
    <div class="pix-slide">Slide 2</div>
    <div class="pix-slide">Slide 3</div>
  </div>
  <button class="prev-btn">Previous</button>
  <button class="next-btn">Next</button>
</div>

<script>
  const basicCarousel = new Swipix({
    container: '#basic-carousel',
    nextButton: '.next-btn', 
    prevButton: '.prev-btn',
    speed: 300,
    slidesPerView: { default: 1 }
  }).init();
</script>
```

### Infinite Loop Carousel

```html
<div class="pix-container" id="infinite-carousel">
  <div class="pix-wrapper">
    <div class="pix-slide">Slide 1</div>
    <div class="pix-slide">Slide 2</div>
    <div class="pix-slide">Slide 3</div>
    <div class="pix-slide">Slide 4</div>
  </div>
  <button class="prev-btn">Previous</button>
  <button class="next-btn">Next</button>
</div>

<script>
  const infiniteCarousel = new Swipix({
    container: '#infinite-carousel',
    nextButton: '.next-btn', 
    prevButton: '.prev-btn',
    infiniteLoop: true,
    speed: 300,
    slidesPerView: { 
      default: 1,
      768: 2
    },
    gap: 15
  }).init();
</script>
```

### Tabs Integration

```html
<div class="tabs-container">
  <button class="tab-btn">Section 1</button>
  <button class="tab-btn">Section 2</button>
</div>

<div class="pix-container" id="tabs-carousel">
  <div class="pix-wrapper">
    <div class="pix-slide">Slide 1</div>
    <div class="pix-slide">Slide 2</div>
    <div class="pix-slide">Slide 3</div>
    <div class="pix-slide">Slide 4</div>
    <div class="pix-slide">Slide 5</div>
    <div class="pix-slide">Slide 6</div>
  </div>
  <button class="prev-btn">Previous</button>
  <button class="next-btn">Next</button>
</div>

<script>
  const tabsCarousel = new Swipix({
    container: '#tabs-carousel',
    nextButton: '.next-btn', 
    prevButton: '.prev-btn',
    infiniteLoop: true,
    slidesPerView: { default: 1 },
    tabsConfig: {
      container: '.tabs-container',
      buttonSelector: '.tab-btn',
      mapping: [0, 3],
      rangeMapping: true
    }
  }).init();
</script>
```

## Troubleshooting

### Common Issues

1. **Carousel Not Initializing**
   - Check that selectors match your HTML structure
   - Ensure script is loaded after the HTML elements
   - Verify there are no JavaScript errors in the console

2. **Infinite Loop Not Working Properly**
   - Check the responsive configuration to ensure enough slides exist
   - Verify `infiniteLoop` is set to `true`
   - Make sure there are enough slides for the feature to work properly

3. **Tabs Not Syncing with Carousel**
   - Verify tab container selector is correct
   - Check that the mapping array is configured properly
   - Ensure that you have the correct number of tab buttons

### Debugging Tips

- Use browser developer tools to inspect the DOM structure
- Monitor the `swipix:slideChanged` events to track carousel state
- Check for CSS issues that might affect carousel appearance

## Advanced Customization

### Custom Event Handlers

```javascript
const carousel = new Swipix({
  container: '#carousel',
  // other config...
}).init();

document.querySelector('#carousel').addEventListener('swipix:slideChanged', (event) => {
  // Custom logic here
  updateProgressBar(event.detail.currentIndex);
});
```

### Styling Recommendations

For the best performance and appearance:

1. Use the CSS structure demonstrated in the examples
2. Keep all position-critical styles in JavaScript (handled by the library)
3. Apply custom styles to `.pix-slide` for appearance
4. Use `active` class provided by the library for active state styling