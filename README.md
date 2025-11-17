# Pinchpan2 JavaScript Library

JavaScript libraries to detect pinch, swipe, and tap events on mobile devices,
and scroll, click-drag, and click events on desktop devices.


## Usage

The library adds events for detecting pinch, swipe, and tap to an element.

pinchpan2.js provides the following methods:
  * `.tappable(element)` adds the `tap` event to an element
    that is called when the user taps (on a mobile device) or clicks (on a
    desktop device).

  * `.pannable(element)` adds the `pan` event to an element
    that is called when the user swipes (on a mobile device) or click-drags
    (on a desktop device).

  * `.pinchable(element)` adds the `pinch` event to an element
    that is called when the user pinches (on a mobile device) or uses
    ctrl-scroll on their mouse (on a desktop device).

  * `.zoomable(element)` makes the element zoomable by the pinch event.  It
    also adds the `zoom` event to an element when the element is zoomed.
    Enabling zoom implies enabling the pinch event.


## Event

The event object passed to the event listener includes the following members:

  * `.detail.clientX` : The clientX position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.clientY` : The clientY position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.screenX` : The screenX position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.screenY` : The screenY position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.pageX`   : The pageX position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.pageY`   : The pageY position where the event occurred.  For pinch and zoom events, it is the center position where the pinch occurred.
  * `.detail.dr`      : The scaled number of pinched pixels.  Only available on `pinch` and `zoom` events.
  * `.detail.altKey`  : `true` if the Alt key is pressed during the event, `false` otherwise.
  * `.detail.ctrlKey` : `true` if the Ctrl key is pressed during the event, `false` otherwise.
  * `.detail.metaKey` : `true` if the Meta key is pressed during the event, `false` otherwise.
  * `.detail.shiftKey`: `true` if the Shift key is pressed during the event, `false` otherwise.


## Example

See [test/index.html] for an example.


[test/index.html]: test/index.html
