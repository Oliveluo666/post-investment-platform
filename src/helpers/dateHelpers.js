import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {string|Date} date - 日期字符串或 Date 对象
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * 格式化日期为中文格式（如：2024年6月1日）
 * @param {string|Date} date - 日期字符串或 Date 对象
 * @returns {string} 格式化后的中文日期字符串
 */
export function formatChineseDate(date) {
  if (!date) return ''
  return dayjs(date).format('YYYY年M月D日')
}

/**
 * 获取当前年份
 * @returns {number} 当前年份
 */
export function getCurrentYear() {
  return dayjs().year()
}

/**
 * 获取当前月份
 * @returns {number} 当前月份（1-12）
 */
export function getCurrentMonth() {
  return dayjs().month() + 1
}

/**
 * 获取当前季度
 * @returns {number} 当前季度（1-4）
 */
export function getCurrentQuarter() {
  return Math.floor((dayjs().month() + 1) / 3)
}
