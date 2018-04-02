'use strict';
var TouchHistoryMath = {

  /**
  * This code is optimized and not intended to look beautiful. This allows
   * computing of touch centroids that have moved after `touchesChangedAfter`
   * timeStamp. You can compute the current centroid involving all touches
   * moves after `touchesChangedAfter`, or you can compute the previous
   * centroid of all touches that were moved after `touchesChangedAfter`.
   *
   * @param {TouchHistoryMath} touchHistory 触摸响应的轨迹数据
   * @param {number} touchesChangedAfter 主动移动后的时间戳
   * @param {boolean} isXAxis 是否是X轴方向
   * @param {boolean} ofCurrent 计算当前移动的质心相对之前移动的质心
   * @return {number} 计算质心在指定尺寸中的值
   */
  centroidDimension: function(touchHistory, touchesChangedAfter, isXAxis, ofCurrent) {
    var touchBank = touchHistory.touchBank;
    var total = 0;
    var count = 0;

    var oneTouchData = touchHistory.numberActiveTouches === 1 ? touchHistory.touchBank[touchHistory.indexOfSingleActiveTouch] : null;

    if (oneTouchData !== null) {
      if (oneTouchData.touchActive && oneTouchData.currentTimeStamp > touchesChangedAfter) {
        total += ofCurrent && isXAxis ? oneTouchData.currentPageX : ofCurrent && !isXAxis ? oneTouchData.currentPageY : !ofCurrent && isXAxis ? oneTouchData.previousPageX : oneTouchData.previousPageY;
        count = 1;
      }
    } else {
      for(var i = 0; i < touchBank.length; i ++) {
        var touchTrack = touchBank[i];
        if(touchTrack !== null && touchTrack !== undefined && touchTrack.touchActive && touchTrack.currentTimeStamp >= touchesChangedAfter) {
          var toAdd;
          if (ofCurrent && isXAxis) {
            toAdd = touchTrack.currentPageX;
          } else if (ofCurrent && !isXAxis) {
            toAdd = touchTrack.currentPageY;
          } else if (!ofCurrent && isXAxis) {
            toAdd = touchTrack.previousPageX;
          } else {
            toAdd = touchTrack.previousPageY;
          }
          total += toAdd;
          count ++;
        }
      }
    }
    return count > 0 ? total / count : TouchHistoryMath.noCentroid;
  },

  currentCentroidXOfTouchesChangedAfter: function(touchHistory, touchesChangedAfter) {
    return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, true, true);
  },

  currentCentroidYOfTouchesChangedAfter: function(touchHistory, touchesChangedAfter) {
    return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, false, true);
  },

  previousCentroidXOfTouchesChangedAfter: function(touchHistory, touchesChangedAfter) {
    return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, true, false);
  },

  previouscentroidYOfTouchesChangedAfter: function(touchHistory, touchesChangedAfter) {
    return TouchHistoryMath.centroidDimension(touchHistory, touchesChangedAfter, false, false);
  },

  currentCentroidX: function(touchHistory) {
    return TouchHistoryMath.centroidDimension(touchHistory, 0, true, true);
  },

  currentCentroidY: function(touchHistory) {
    return TouchHistoryMath.centroidDimension(touchHistory, 0, false, true);
  },

  noCentroid: -1,
}

module.exports = TouchHistoryMath;