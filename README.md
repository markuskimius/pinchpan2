# Pinchpan2 JavaScript Library

JavaScript libraries to detect pinch and swipe events on mobile devices,
and scroll and click-drag events on desktop devices.


## Usage

The library adds events for detecting pinch, swipe, and tap to an element.

pinchpan2.js provides the following methods:
  * `.pannable(element[, options])` adds the `pan` event to an element
    that is called when the user swipes (on a mobile device) or click-drags
    while holding down ctrl or cmd (on a desktop device).

  * `.pinchable(element[, options])` adds the `pinch` event to an element
    that is called when the user pinches (on a mobile device) or uses
    ctrl-scroll/cmd-scroll on their mouse (on a desktop device).

  * `.zoomable(element[, options])` makes the element zoomable by the pinch
    event, and pannable by the pan event.  It also adds the `zoom` event to an
    element when the element is zoomed.  Enabling zoom implies enabling the
    pinch and pan events.


## Event

The event object passed to the event listener includes the following members:

  * `.detail.clientX` : The clientX position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.clientY` : The clientY position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.screenX` : The screenX position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.screenY` : The screenY position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.pageX`   : The pageX position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.pageY`   : The pageY position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.dx`      : Number of panned pixels in the horizontal direction.  Only available on the `pan` event.
  * `.detail.dy`      : Number of panned pixels in the vertical direction.  Only available on the `pan` event.
  * `.detail.dr`      : Number of pinched pixels.  Only available on `pinch` and `zoom` events.
  * `.detail.altKey`  : `true` if the Alt key is pressed during the event, `false` otherwise.
  * `.detail.ctrlKey` : `true` if the Ctrl key is pressed during the event, `false` otherwise.
  * `.detail.metaKey` : `true` if the Meta key is pressed during the event, `false` otherwise.
  * `.detail.shiftKey`: `true` if the Shift key is pressed during the event, `false` otherwise.


## Options

`options` is an object that may specify zero or more of the following:

  * `.panInertia`   : When panning, the inertia of the pan.  The default is 0.98;
  * `.pinchSpeed`   : When pinching, the speed at which the pinching should occur.  The default is double the ratio of the size of the element to the page.
  * `.zoomMin`      : When zooming, the mininum allowed zoom level.  The default is 0.01.  Must be greater than 0.
  * `.zoomPerPixel` : When zooming, the amount to zoom by a single pixel of pinching action.  The default is the inverse of the size of the element being zoomed.


## Example

See [test/index.html] for an example.


[test/index.html]: test/index.html
