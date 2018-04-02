

import { InteractionManager } from 'react-native';
import TouchHistoryMath from './TouchHistoryMath';
import { pinchDistance } from './TouchDistanceMath';
import TimerMixin from 'react-timer-mixin';

const currentCentroidXOfTouchesChangedAfter = TouchHistoryMath.currentCentroidXOfTouchesChangedAfter;
const currentCentroidYOfTouchesChangedAfter = TouchHistoryMath.currentCentroidYOfTouchesChangedAfter;
const previousCentroidXOfTouchesChangedAfter = TouchHistoryMath.previousCentroidXOfTouchesChangedAfter;
const previouscentroidYOfTouchesChangedAfter = TouchHistoryMath.previouscentroidYOfTouchesChangedAfter;
const currentCentroidX = TouchHistoryMath.currentCentroidX;
const currentCentroidY = TouchHistoryMath.currentCentroidY;

const TAP_UP_TIME_THRESHOLD = 200;
const TAP_MOVE_THRESHOLD = 10;
const MOVE_THRESHOLD = 2;

let DEV = false;

function initializeGestureState(gestureState) {
  gestureState.moveX = 0;
  gestureState.moveY = 0;
  gestureState.x0 = 0;
  gestureState.y0 = 0;
  gestureState.dx = 0;
  gestureState.dy = 0;
  gestureState.vx = 0;
  gestureState.vy = 0;
  gestureState.numberActiveTouches = 0;

  gestureState._accountsForMovesUpTo = 0;

  gestureState.previousMoveX = 0;
  gestureState.previousMoveY = 0;
  gestureState.pinch = undefined;
  gestureState.previousPinch = undefined;
  gestureState.singleTapUp = false;
  gestureState.doubleTapUp = false;
  gestureState._singleTabFailed = false;
}

function updateGestureStateOnMove(gestureState, touchHistory, e) {
  const movedAfter = gestureState._accountsForMovesUpTo;
  const prevX = previousCentroidXOfTouchesChangedAfter(touchHistory, movedAfter);
  const prevY = previouscentroidYOfTouchesChangedAfter(touchHistory, movedAfter);
  const x = currentCentroidXOfTouchesChangedAfter(touchHistory, movedAfter);
  const y = currentCentroidYOfTouchesChangedAfter(touchHistory, movedAfter);
  const dx = x - prevX;
  const dy = y - prevY;

  gestureState.numberActiveTouches = touchHistory.numberActiveTouches;
  gestureState.moveX = x;
  gestureState.moveY = y;

  const dt = convertToMillisecIfNeeded(touchHistory.mostRecentTimeStamp - movedAfter);
  gestureState.vx = dx / dt;
  gestureState.vy = dy / dt;
  gestureState.dx += dx;
  gestureState.dy += dy;
  gestureState._accountsForMovesUpTo = touchHistory.mostRecentTimeStamp;

  gestureState.previousMoveX = prevX;
  gestureState.previousMoveY = prevY;
  gestureState.pinch = pinchDistance(touchHistory, movedAfter, true);
  gestureState.previousPinch = pinchDistance(touchHistory, movedAfter, false);
}

function clearInteractionHandle(interactionState) {
  if (interactionState.handle) {
    InteractionManager.clearInteractionHandle(interactionState.handle);
    interactionState.handle = null;
  }
}

export default function create(config) {
  if (config.debug) {
    DEV = true;
  }

  const interactionState = {
    handle: null,
  };
  const gestureState = {
    // Useful for debugging
    stateID: Math.random()
  };
  initializeGestureState(gestureState);

  const handlers = {
    onStartShouldSetResponder: function(e) {
      DEV && console.log('onStartShouldSetResponder');
      cancelSingleTapConfirm(gestureState);
      return config.onStartShouldSetResponder ?
        config.onStartShouldSetResponder(e, gestureState) :
        false;
    },
    onMoveShouldSetResponder: function(e) {
      DEV && console.log('onMoveShouldSetResponder');
      return config.onMoveShouldSetResponder &&
        effectiveMove(config, gestureState) ?
        config.onMoveShouldSetResponder(e, gestureState) :
        false;
    },
    onStartShouldSetResponderCapture: function(e) {
      DEV && console.log('onStartShouldSetResponderCapture');
      cancelSingleTapConfirm(gestureState);

      if (e.nativeEvent.touches.length === 1) {
        initializeGestureState(gestureState);
      }
      gestureState.numberActiveTouches = e.touchHistory.numberActiveTouches;
      return config.onStartShouldSetResponderCapture ?
        config.onStartShouldSetResponderCapture(e, gestureState) :
        false;
    },
    onMoveShouldSetResponderCapture: function(e) {
      DEV && console.log('onMoveShouldSetResponderCapture');
      const touchHistory = e.touchHistory;
      if (gestureState._accountsForMovesUpTo === touchHistory.mostRecentTimeStamp) {
        return false;
      }
      updateGestureStateOnMove(gestureState, touchHistory, e);
      return config.onMoveShouldSetResponderCapture && effectiveMove(config, gestureState) ?
        config.onMoveShouldSetResponderCapture(e, gestureState) :
        false;
    },
    onResponderGrant: function(e) {
      DEV && console.log('onResponderGrant');
      cancelSingleTapConfirm(gestureState);
      if (!interactionState.handle) {
        interactionState.handle = InteractionManager.createInteractionHandle();
      }
      gestureState._grantTimestamp = e.touchHistory.mostRecentTimeStamp;
      gestureState.x0 = currentCentroidX(e.touchHistory);
      gestureState.y0 = currentCentroidY(e.touchHistory);
      gestureState.dx = 0;
      gestureState.dy = 0;
      if (config.onResponderGrant(e, gestureState)) {
        config.onResponderGrant(e, gestureState);
      }
      return config.onShouldBlockNativeResponder === undefined ?
        true :
        config.onShouldBlockNativeResponder();
    },
    onResponderReject: function(e) {
      DEV && console.log('onResponderReject');
      clearInteractionHandle(interactionState);
      config.onResponderGrant && config.onResponderReject(e, gestureState);
    },
    onResponderRelease: function(e) {
      if (gestureState.singleTapUp) {
        if (gestureState._lastSingleTapUp) {
          if (convertToMillisecIfNeeded(e.touchHistory.mostRecentTimeStamp - gestureState._lastReleaseTimestamp)
            < TAP_UP_TIME_THRESHOLD) {
              gestureState.doubleTapUp = true;
            }
        }
        gestureState._lastSingleTapUp = true;

        if (!gestureState.doubleTapUp) {
          const snapshot = Object.assign({}, gestureState);
          const timeoutId = TimerMixin.setTimeout(() => {
            if (gestureState._singleTapConfirmId === timeoutId) {
              DEV && console.log('onResponderSingleTapConfirmed...');
              config.onResponderSingleTapConfirmed && config.onResponderSingleTapConfirmed(e, gestureState);
            }
          }, TAP_UP_TIME_THRESHOLD);
          gestureState._singleTapConfirmId = timeoutId;
        }
      }
      gestureState._lastReleaseTimestamp = e.touchHistory.mostRecentTimeStamp;
      DEV && console.log('onResponderRelease...' + JSON.stringify(gestureState));
      clearInteractionHandle(interactionState);
      config.onResponderRelease && config.onResponderRelease(e, gestureState);
      initializeGestureState(gestureState);
    },
    onResponderStart: function(e) {
      DEV && console.log('onResponderStart');
      const touchHistory = e.touchHistory;
      gestureState.numberActiveTouches = touchHistory.numberActiveTouches;
      if (config.onResponderStart) {
        config.onResponderStart(e, gestureState);
      }
    },
    onResponderMove: function(e) {
      const touchHistory = e.touchHistory;
      if (gestureState._accountsForMovesUpTo === touchHistory.mostRecentTimeStamp) {
        return;
      }

      updateGestureStateOnMove(gestureState, touchHistory, e);

      DEV && console.log('onResponderMove...' + JSON.stringify(gestureState));
      if (config.onResponderMove && effectiveMove(config, gestureState)) {
        config.onResponderMove(e, gestureState);
      }
    },
    onResponderEnd: function(e) {
      const touchHistory = e.touchHistory;
      gestureState.numberActiveTouches = touchHistory.numberActiveTouches;

      if (touchHistory.numberActiveTouches > 0
        || convertToMillisecIfNeeded(touchHistory.mostRecentTimeStamp - gestureState._grantTimestamp) > TAP_UP_TIME_THRESHOLD
        || Math.abs(gestureState.dx) >= TAP_MOVE_THRESHOLD
        || Math.abs(gestureState.dy) >= TAP_MOVE_THRESHOLD
      ) {
        gestureState._singleTabFailed = true;
      }
      if (!gestureState._singleTabFailed) {
        gestureState.singleTapUp = true;
      }

      DEV && console.log('onResponderEnd...' + JSON.stringify(gestureState));
      clearInteractionHandle(interactionState);
      config.onResponderEnd && config.onResponderEnd(e, gestureState);
    },
    onResponderTerminate: function(e) {
      DEV && console.log('onResponderTerminate...');
      clearInteractionHandle(interactionState);
      config.onResponderTerminate && config.onResponderTerminate(e, gestureState);
      initializeGestureState(gestureState);
    },
    onResponderTerminationRequest: function (e) {
      DEV && console.log('onResponderTerminationRequest...');
      return config.onResponderTerminationRequest ?
        config.onResponderTerminationRequest(e.gestureState) :
        true;
    }
  };
  return {...handlers};
}

function convertToMillisecIfNeeded(interval) {
  if (interval > 1000000) {
    return interval / 1000000;
  }
  return interval;
}

function cancelSingleTapConfirm(gestureState) {
  if (typeof gestureState._singleTapConfirmId === 'undefined') {
    TimerMixin.clearTimeout(gestureState._singleTapConfirmId);
    gestureState._singleTapConfirmId = undefined;
  }
}

function effectiveMove(config, gestureState) {
  if (gestureState.numberActiveTouches > 1) {
    return true;
  }
  let moveThreshold = MOVE_THRESHOLD;
  if (typeof config.moveThreshold === 'number') {
    moveThreshold = config.minMoveDistance;
  }
  if (Math.abs(gestureState.dx) >= moveThreshold || Math.abs(gestureState.dy) >= moveThreshold) {
    return true;
  }
  return false;
}
