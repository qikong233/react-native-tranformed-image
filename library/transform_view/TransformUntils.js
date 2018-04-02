import Rect from './Rect';

export { Rect };

export class Transform {
  /**
   * 
   * @param scale 缩放比
   * @param translateX X方向位移
   * @param translateY y方向位移
   * @param pivot 中心点
   */
  constructor(scale, translateX, translateY, pivot) {
      this.scale = scale;
      this.translateX = translateX;
      this.translateY = translateY;
      this.pivot = pivot;
  }
}

/**
 * 是否是number
 * @param number 
 */
function isValidNumber(number) {
  if (typeof number === 'number') {
    if (!isNaN(number)) {
      return true;
    }
  }
  return false;
}

/**
 * 是否是Rect类型
 * @param {传入校验的rect} rect 
 */
function isValidRect(rect) {
  if (rect instanceof Rect && rect.isValid()) {
    return true;
  }
  return false;
}

/**
 * 判断是否是transform类型
 * @param {传入校验的transform} transform 
 */
function isValidTransform(transform) {
  if (transform &&
    isValidNumber(transform.scale) &&
    isValidNumber(transform.translateX) &&
    isValidNumber(transform.translateY)
  ) {
    return true;
  }
  return false;
}

/**
 * 缩放图片之后适应上下文大小
 * 返回传入试图适应上下文之后的宽和高
 * @param {上下文宽高比} contentAspectRatio 
 * @param {传入试图的宽高比} contentRect 
 */
export function fitCenterRect(contentAspectRatio, contentRect) {
  let w = contentRect.width();
  let h = contentRect.height();
  let viewAspectRatio = w / h;

  if(contentAspectRatio > viewAspectRatio) {
    h = w / contentAspectRatio;
  } else {
    w = h * contentAspectRatio;
  }

  return new Rect(
    contentRect.centerX() - w / 2,
    contentRect.centerY() - h / 2,
    contentRect.centerX() + w / 2,
    contentRect.centerY() + h / 2
  );
} 

/**
 * 传入一个Rect和Transform，Rect根据Transform的移动信息来获得一个新的Rect
 * @param {Rect} rect 
 * @param {Rect} transform 
 */
export function transformedRect(rect, transform) {
  if (!isValidRect(rect)) {
    throw new Error('From transformedRect... Reason: invalid rect');
  }
  if (!isValidTransform(transform)) {
    throw new Error('From transformedRect... Reason: invalid transform');
  }

  let scale = transform.scale;
  let translateX = transform.translateX;
  let translateY = transform.translateY;

  let pivot = transform.pivot;
  if (pivot === undefined || pivot === null) {
    let width = rect.width() * scale;
    let height = rect.height() * scale;
    let centerX = rect.centerX() + translateX * scale;
    let centerY = rect.centerY() + translateY * scale;
    return new Rect(
      centerX - width / 2,
      centerY - height / 2,
      centerX + width / 2,
      centerY + height / 2
    )
  } else {
    let pivotX = pivot.x;
    let pivotY = pivot.y;
    if(!isValidNumber(pivotX) || !isValidNumber(pivotY)) {
      throw new Error('From transformedRect... Reason invalid pivotX:' + pivotX + ' and pivotY:' + pivotY );
    }
    let resultRect = transformedRect(rect, {
      scale, translateX, translateY
    });

    let dx = (scale - 1) * (pivotX - resultRect.centerX());
    let dy = (scale -1) * (pivotY - resultRect.centerY());
    return resultRect.offset(-dx, -dy);

  }
}

/**
 * 根据两个位置返回一个Transform
 * @param {Rect} fromRect 
 * @param {Rect} toRect 
 */
export function getTransform(fromRect, toRect) {
  let scale = toRect.width() / fromRect.width();
  let translateX = (toRect.centerX() - fromRect.centerX()) / scale;
  let translateY = (toRect.centerY() - fromRect.centerY()) / scale;

  return new Transform(scale, translateX, translateY);
}

/**
 * 计算出窗口和视图之间x方向和y方向之间的差值，用于避免滑动空白
 * @param {Rect} rect 
 * @param {Rect} viewPortRect 
 */
export function alignedRect(rect, viewPortRect) {
  let dx = 0;
  let dy = 0;

  if (rect.width() > viewPortRect.width()) {
    if (rect.left > viewPortRect.left) {
      dx = viewPortRect.left - rect.left;
    } else {
      dx = rect.right - viewPortRect.right;
    }
  } else {
    dx = viewPortRect.centerX() - rect.centerX();
  }

  if (rect.height() > viewPortRect.height()) {
    if (rect.top > viewPortRect.top) {
      dy = viewPortRect.top - rect.top;
    } else {
      dy = rect.bottom - viewPortRect.bottom;
    }
  } else {
    dy = viewPortRect.centerY() - rect.centerY();
  }

  return rect.copy().offset(dx, dy);
}

/**
 * 计算可以移动的空间
 * @param {视图位置} rect 
 * @param {窗口位置} viewPortRect 
 */
export function availableTranslateSpace(rect, viewPortRect) {
  return {
    left: viewPortRect.left - rect.left,
    right: rect.right - viewPortRect.right,
    top: viewPortRect.top - rect.top,
    bottom: rect.bottom - viewPortRect.bottom,
  }
}