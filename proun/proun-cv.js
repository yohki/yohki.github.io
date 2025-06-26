/**
 * ProunLib.js - OpenCV.js版
 * 元のC++ ProunLib.hのJavaScript移植版
 * 
 * @author Your Name
 * @version 1.0.0
 */

// OpenCV.jsの読み込み状態
let opencvReady = false;

// OpenCV.jsの読み込み完了コールバック
function onOpenCVReady() {
    cv['onRuntimeInitialized'] = ()=>{
        opencvReady = true;
        if (typeof window.onProunLibReady === 'function') {
            window.onProunLibReady();
        }
    }
}

// OpenCV.jsの読み込み
if (typeof cv !== 'undefined') {
    onOpenCVReady();
} else {
    // OpenCV.jsがまだ読み込まれていない場合
    const script = document.createElement('script');
    script.async = true;
    script.src = 'opencv.js';
    script.onload = onOpenCVReady;
    document.head.appendChild(script);
}

/**
 * ProunLib - 画像解析ライブラリ
 */
class ProunLib {
    /**
     * Line構造体のJavaScript版
     * @param {number} r - 直線の距離パラメータ
     * @param {number} th - 直線の角度パラメータ（ラジアン）
     * @returns {Object} Lineオブジェクト
     */
    static createLine(r, th) {
        return { r: r, th: th };
    }

    /**
     * HSV構造体のJavaScript版
     * @param {number} hue - 色相 (0-360)
     * @param {number} saturation - 彩度 (0-100)
     * @param {number} value - 明度 (0-100)
     * @returns {Object} Hsvオブジェクト
     */
    static createHsv(hue, saturation, value) {
        return {
            hue: hue,
            saturation: saturation,
            value: value,
            /**
             * HSVをRGBに変換
             * @returns {Array} [r, g, b] 配列
             */
            getRGB: function() {
                return ProunLib.hsvToRgb(this.hue, this.saturation, this.value);
            }
        };
    }

    /**
     * HSV to RGB変換
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 彩度 (0-100)
     * @param {number} v - 明度 (0-100)
     * @returns {Array} [r, g, b] 配列
     */
    static hsvToRgb(h, s, v) {
        const rgb = [0, 0, 0];
        
        if (s === 0) {
            rgb[0] = rgb[1] = rgb[2] = Math.floor(255 * (v / 100.0));
            return rgb;
        }

        const sNorm = s / 100.0;
        const vNorm = v / 100.0;
        const hi = Math.floor(h / 60.0) % 6;
        const f = h / 60.0 - hi;
        const p = vNorm * (1 - sNorm);
        const q = vNorm * (1 - f * sNorm);
        const t = vNorm * (1 - (1 - f) * sNorm);
        
        let r = 0, g = 0, b = 0;
        
        switch (hi) {
            case 0: r = vNorm; g = t; b = p; break;
            case 1: r = q; g = vNorm; b = p; break;
            case 2: r = p; g = vNorm; b = t; break;
            case 3: r = p; g = q; b = vNorm; break;
            case 4: r = t; g = p; b = vNorm; break;
            case 5: r = vNorm; g = p; b = q; break;
        }
        
        rgb[0] = Math.floor(r * 255);
        rgb[1] = Math.floor(g * 255);
        rgb[2] = Math.floor(b * 255);
        
        return rgb;
    }

    /**
     * RGB to HSV変換
     * @param {number} r - 赤 (0-255)
     * @param {number} g - 緑 (0-255)
     * @param {number} b - 青 (0-255)
     * @returns {Object} {hue, saturation, value} オブジェクト
     */
    static rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0, s = 0, v = max;
        
        if (diff !== 0) {
            s = diff / max;
            switch (max) {
                case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
                case g: h = (b - r) / diff + 2; break;
                case b: h = (r - g) / diff + 4; break;
            }
            h /= 6;
        }
        
        return { 
            hue: Math.round(h * 360), 
            saturation: Math.round(s * 100), 
            value: Math.round(v * 100) 
        };
    }

    /**
     * 線検出（OpenCV.js版）
     * @param {cv.Mat} img - 入力画像
     * @param {number} threshold - Hough線検出の閾値
     * @returns {Array} Lineオブジェクトの配列
     */
    static findLines(img, threshold) {
        try {
            if (!opencvReady) {
                throw new Error('OpenCV.js is not loaded yet');
            }

            // グレースケール変換
            const gray = new cv.Mat();
            if (img.channels() === 3) {
                cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);
            } else {
                img.copyTo(gray);
            }

            // Cannyエッジ検出
            const edges = new cv.Mat();
            cv.Canny(gray, edges, 50, 200, 3);

            // Hough線検出
            const lines = new cv.Mat();
            cv.HoughLines(edges, lines, 1, Math.PI / 180, threshold, 0, 0);

            const result = [];
            for (let i = 0; i < lines.rows; i++) {
                const rho = lines.data32F[i * 2];
                const theta = lines.data32F[i * 2 + 1];
                result.push(ProunLib.createLine(rho, theta));
            }

            // メモリ解放
            gray.delete();
            edges.delete();
            lines.delete();

            return result;
        } catch (error) {
            console.error('findLines error:', error);
            return [];
        }
    }

    /**
     * 重要な線検出（OpenCV.js版）
     * @param {string} imageUrl - 画像URL
     * @param {number} minLines - 最小線数
     * @param {number} maxLines - 最大線数
     * @returns {Promise<Array>} Lineオブジェクトの配列
     */
    static async findSignificantLines(imageUrl, minLines = 3, maxLines = 10) {
        return new Promise((resolve, reject) => {
            if (!opencvReady) {
                reject(new Error('OpenCV.js is not loaded yet'));
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // ImageDataからMatに変換
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const mat = cv.matFromImageData(imageData);

                    let threshold = 200;
                    const minThreshold = 50;
                    const maxThreshold = 1000;
                    let steps = threshold / 20;
                    let lines = null;

                    let i = 0;
                    while (i < 40) {
                        const result = ProunLib.findLines(mat, threshold);
                        if (result && result.length > 0) {
                            const n = result.length;
                            console.log(threshold + ', ' +n)
                            if (minLines <= n && n <= maxLines) {
                                lines = result;
                                break;
                            } else {
                                threshold = (maxLines < n) ? threshold + steps : threshold - steps;
                                steps = Math.ceil(threshold / 20);
                                if (threshold < minThreshold || maxThreshold < threshold || steps === 0) {
                                    lines = result;
                                    break;
                                }
                            }
                            i++;
                        } else if (result && result.length == 0) {
                            threshold -= steps;
                            steps = Math.ceil(threshold / 20);
                            i++;
                        } else {
                            console.error('ERROR on image analysis:', imageUrl);
                            break;
                        }
                    }

                    // メモリ解放
                    mat.delete();

                    resolve(lines || []);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = imageUrl;
        });
    }

    /**
     * 色相ヒストグラムによる色抽出（OpenCV.js版）
     * @param {string} imageUrl - 画像URL
     * @param {number} n - 抽出する色数
     * @returns {Promise<Array>} Hsvオブジェクトの配列
     */
    static async getColorsByHueHistogram(imageUrl, n = 8) {
        return new Promise((resolve, reject) => {
            if (!opencvReady) {
                reject(new Error('OpenCV.js is not loaded yet'));
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // ImageDataからMatに変換
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const mat = cv.matFromImageData(imageData);

                    const HSV_N_HUES = 36;
                    const HSV_N_VALS = 10;
                    const HSV_MINIMUM_S = 0.1;
                    const HSV_MINIMUM_V = 0.1;

                    const colors = [];
                    for (let i = 0; i < n; i++) {
                        colors.push(ProunLib.createHsv(0, 0, 0));
                    }

                    // BGR to HSV変換
                    const hsvImg = new cv.Mat();
                    cv.cvtColor(mat, hsvImg, cv.COLOR_RGBA2BGR);
                    cv.cvtColor(hsvImg, hsvImg, cv.COLOR_BGR2HSV);

                    const hues = new Map();
                    const grays = new Map();
                    const accumS = new Array(HSV_N_HUES).fill(0);
                    const accumV = new Array(HSV_N_HUES).fill(0);

                    // ピクセルごとにHSV値を解析
                    for (let j = 0; j < hsvImg.rows; j++) {
                        for (let i = 0; i < hsvImg.cols; i++) {
                            const pixel = hsvImg.ucharPtr(j, i);
                            const hueRaw = pixel[0];
                            const hueIndex = Math.floor(hueRaw / (180 / HSV_N_HUES));
                            const s = pixel[1] / 255.0;
                            const v = pixel[2] / 255.0;

                            if (s < HSV_MINIMUM_S) {
                                const grayIndex = Math.round(v * 100 / (100 / HSV_N_VALS));
                                grays.set(grayIndex, (grays.get(grayIndex) || 0) + 1);
                            } else if (HSV_MINIMUM_V < v) {
                                hues.set(hueIndex, (hues.get(hueIndex) || 0) + 1);
                                accumS[hueIndex] += s;
                                accumV[hueIndex] += v;
                            }
                        }
                    }

                    // 値でソート
                    const sortedHues = Array.from(hues.entries())
                        .sort((a, b) => b[1] - a[1]);

                    const m = Math.min(n, sortedHues.length);
                    for (let i = 0; i < m; i++) {
                        const [hueIndex, count] = sortedHues[i];
                        const hue = hueIndex * (360 / HSV_N_HUES);
                        const saturation = Math.round((accumS[hueIndex] / count) * 100);
                        const value = Math.round((accumV[hueIndex] / count) * 100);

                        colors[i] = ProunLib.createHsv(hue, saturation, value);
                    }

                    // グレー色で残りを埋める
                    if (m < n) {
                        const sortedGrays = Array.from(grays.entries())
                            .sort((a, b) => b[1] - a[1]);
                        
                        for (let i = m; i < n && i - m < sortedGrays.length; i++) {
                            const [grayIndex, count] = sortedGrays[i - m];
                            colors[i] = ProunLib.createHsv(0, 0, grayIndex * (100 / HSV_N_VALS));
                        }
                    }

                    // メモリ解放
                    mat.delete();
                    hsvImg.delete();

                    resolve(colors);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = imageUrl;
        });
    }

    /**
     * 画像解析（統合関数）
     * @param {string} imageUrl - 画像URL
     * @param {Object} options - オプション
     * @param {number} options.minLines - 最小線数
     * @param {number} options.maxLines - 最大線数
     * @param {number} options.colorCount - 抽出する色数
     * @returns {Promise<Object>} 解析結果
     */
    static async analyzeImage(imageUrl, options = {}) {
        const {
            minLines = 3,
            maxLines = 10,
            colorCount = 8
        } = options;

        try {
            const [lines, colors] = await Promise.all([
                ProunLib.findSignificantLines(imageUrl, minLines, maxLines),
                ProunLib.getColorsByHueHistogram(imageUrl, colorCount)
            ]);

            // 画像サイズを取得
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    resolve({
                        width: img.width,
                        height: img.height,
                        lines: lines,
                        colors: colors,
                        path: imageUrl
                    });
                };
                img.onerror = () => reject(new Error('Failed to get image size'));
                img.src = imageUrl;
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * OpenCV.jsの読み込み状態を確認
     * @returns {boolean} 読み込み完了状態
     */
    static isReady() {
        return opencvReady;
    }

    /**
     * OpenCV.jsの読み込み完了を待つ
     * @param {number} timeout - タイムアウト時間（ミリ秒）
     * @returns {Promise} 読み込み完了Promise
     */
    static waitForReady(timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (opencvReady) {
                resolve();
                return;
            }

            const timer = setTimeout(() => {
                reject(new Error('OpenCV.js loading timed out'));
            }, timeout);

            const checkInterval = setInterval(() => {
                if (opencvReady) {
                    clearInterval(checkInterval);
                    clearTimeout(timer);
                    resolve();
                }
            }, 100);
        });
    }
}

// グローバルに公開
window.ProunLib = ProunLib;

// モジュール対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProunLib;
} 