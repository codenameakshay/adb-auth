// Renders the ADB Auth brand tile (rounded navy tile + green Wi-Fi glyph)
// with CoreGraphics and writes resources/icon.png, resources/icon.ico,
// tray-icon(@2x).png, and macOS trayTemplate(@2x).png.
// Run from the repo root: swift scripts/generate-icons.swift

import Foundation
import CoreGraphics
import ImageIO

// MARK: - Colors

let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!

func rgba(_ r: Int, _ g: Int, _ b: Int, _ a: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: colorSpace, components: [CGFloat(r) / 255, CGFloat(g) / 255, CGFloat(b) / 255, a])!
}

let bgTop = rgba(0x10, 0x1d, 0x30)
let bgBottom = rgba(0x08, 0x0f, 0x18)
let strokeGreen = rgba(34, 197, 94, 0.45)
let glyphGreen = rgba(134, 239, 172)
let glyphBlack = rgba(0, 0, 0)

// MARK: - Context helpers

func makeContext(size: Int) -> CGContext {
    let ctx = CGContext(
        data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4,
        space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )!
    // Flip to a top-left-origin, y-down space so drawing math matches the
    // 24-unit design grid (which follows the usual SVG/icon convention).
    ctx.translateBy(x: 0, y: CGFloat(size))
    ctx.scaleBy(x: 1, y: -1)
    return ctx
}

func roundedRectPath(_ rect: CGRect, radius: CGFloat) -> CGPath {
    CGPath(roundedRect: rect, cornerWidth: max(0, radius), cornerHeight: max(0, radius), transform: nil)
}

// MARK: - Wi-Fi glyph (lucide "wifi", 24-unit grid, y increasing downward)

enum WifiGlyph {
    static let center = CGPoint(x: 12, y: 20)
    /// Arc radius and half of its chord width, straight from the lucide paths.
    static let arcs: [(radius: CGFloat, halfChord: CGFloat)] = [(5, 3.5), (10, 7), (15, 10)]

    /// Thicker strokes below 48 px so the arcs survive at tray sizes.
    static func strokeWidth(canvas: Int) -> CGFloat {
        canvas >= 48 ? 2.0 : 2.75
    }

    /// Draws the glyph assuming the current CTM maps 1 unit to 1 grid unit,
    /// with (0,0) at the glyph box's top-left corner and y increasing down.
    static func draw(in ctx: CGContext, color: CGColor, strokeWidth: CGFloat) {
        ctx.setStrokeColor(color)
        ctx.setFillColor(color)
        ctx.setLineWidth(strokeWidth)
        ctx.setLineCap(.round)

        for arc in arcs {
            let half = asin(arc.halfChord / arc.radius)
            let up = -CGFloat.pi / 2
            ctx.addArc(center: center, radius: arc.radius, startAngle: up - half, endAngle: up + half, clockwise: false)
            ctx.strokePath()
        }

        ctx.fillEllipse(in: CGRect(x: center.x - strokeWidth / 2, y: center.y - strokeWidth / 2, width: strokeWidth, height: strokeWidth))
    }
}

// MARK: - Tile + glyph composition

/// Tile design: rounded navy tile with a green Wi-Fi glyph. Used for the app
/// icon and the (non-template) tray icons.
func renderTile(size: Int) -> CGContext {
    let ctx = makeContext(size: size)
    let s = CGFloat(size)

    let inset = s * 0.04
    let tileRect = CGRect(x: inset, y: inset, width: s - 2 * inset, height: s - 2 * inset)
    let cornerRadius = tileRect.width * 0.22
    let tilePath = roundedRectPath(tileRect, radius: cornerRadius)

    ctx.saveGState()
    ctx.addPath(tilePath)
    ctx.clip()
    let gradient = CGGradient(colorsSpace: colorSpace, colors: [bgTop, bgBottom] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(
        gradient, start: CGPoint(x: tileRect.midX, y: tileRect.minY),
        end: CGPoint(x: tileRect.midX, y: tileRect.maxY), options: []
    )
    ctx.restoreGState()

    let lineWidth = max(1, s * 0.015)
    let strokeRect = tileRect.insetBy(dx: lineWidth / 2, dy: lineWidth / 2)
    let strokePath = roundedRectPath(strokeRect, radius: cornerRadius - lineWidth / 2)
    ctx.addPath(strokePath)
    ctx.setStrokeColor(strokeGreen)
    ctx.setLineWidth(lineWidth)
    ctx.strokePath()

    // Glyph box (24 units) scaled to 62% of the tile width, centered, then
    // nudged so the arcs' visual center (grid y ~= 5..20, midpoint 12.5)
    // lands on the tile's center instead of the box's geometric center (12,12).
    let glyphScale = 0.62 * tileRect.width / 24
    let visualCenter = CGPoint(x: 12, y: 12.5)
    let canvasCenter = CGPoint(x: s / 2, y: s / 2)
    ctx.saveGState()
    ctx.translateBy(x: canvasCenter.x - glyphScale * visualCenter.x, y: canvasCenter.y - glyphScale * visualCenter.y)
    ctx.scaleBy(x: glyphScale, y: glyphScale)
    WifiGlyph.draw(in: ctx, color: glyphGreen, strokeWidth: WifiGlyph.strokeWidth(canvas: size))
    ctx.restoreGState()

    return ctx
}

/// macOS menu-bar template: just the glyph, opaque black on a transparent
/// background, filling the whole canvas (1px padding at 16px).
func renderTemplate(size: Int) -> CGContext {
    let ctx = makeContext(size: size)
    let s = CGFloat(size)
    let padding: CGFloat = size == 16 ? 1 : 0
    let glyphScale = (s - 2 * padding) / 24

    ctx.saveGState()
    ctx.translateBy(x: s / 2 - glyphScale * 12, y: s / 2 - glyphScale * 12)
    ctx.scaleBy(x: glyphScale, y: glyphScale)
    WifiGlyph.draw(in: ctx, color: glyphBlack, strokeWidth: WifiGlyph.strokeWidth(canvas: size))
    ctx.restoreGState()

    return ctx
}

// MARK: - PNG output

func pngData(_ ctx: CGContext) -> Data {
    guard let image = ctx.makeImage() else { fatalError("could not snapshot context") }
    let data = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil) else {
        fatalError("could not create PNG destination")
    }
    CGImageDestinationAddImage(dest, image, nil)
    guard CGImageDestinationFinalize(dest) else { fatalError("could not finalize PNG") }
    return data as Data
}

func writePNG(_ ctx: CGContext, to path: String) {
    try! pngData(ctx).write(to: URL(fileURLWithPath: path))
}

// MARK: - ICO output (256 as PNG, smaller sizes as 32bpp BMP/DIB)

extension Data {
    mutating func appendLE16(_ v: UInt16) {
        append(UInt8(v & 0xff))
        append(UInt8((v >> 8) & 0xff))
    }

    mutating func appendLE32(_ v: UInt32) {
        append(UInt8(v & 0xff))
        append(UInt8((v >> 8) & 0xff))
        append(UInt8((v >> 16) & 0xff))
        append(UInt8((v >> 24) & 0xff))
    }
}

/// Straight-alpha BGRA pixel bytes, bottom-up (row 0 = bottom of the image),
/// as required by the BMP/DIB format embedded in .ico files. CGBitmapContext
/// stores its raw buffer top-down (row 0 = top), so rows are reversed here.
func straightBGRARowsBottomUp(_ ctx: CGContext) -> [UInt8] {
    let width = ctx.width
    let height = ctx.height
    let base = ctx.data!.bindMemory(to: UInt8.self, capacity: width * height * 4)
    var out = [UInt8](repeating: 0, count: width * height * 4)
    for memRow in 0..<height {
        let fileRow = height - 1 - memRow
        for col in 0..<width {
            let si = (memRow * width + col) * 4
            let di = (fileRow * width + col) * 4
            let a = base[si + 3]
            guard a > 0 else { continue }
            func unpremultiply(_ c: UInt8) -> UInt8 {
                UInt8(min(255, (Double(c) * 255 / Double(a)).rounded()))
            }
            out[di] = unpremultiply(base[si + 2])
            out[di + 1] = unpremultiply(base[si + 1])
            out[di + 2] = unpremultiply(base[si])
            out[di + 3] = a
        }
    }
    return out
}

func icoBMPFrame(_ ctx: CGContext) -> Data {
    let width = ctx.width
    let height = ctx.height
    let xor = Data(straightBGRARowsBottomUp(ctx))
    let maskRowBytes = ((width + 31) / 32) * 4
    let mask = Data(repeating: 0, count: maskRowBytes * height)

    var header = Data()
    header.appendLE32(40) // biSize
    header.appendLE32(UInt32(width)) // biWidth
    header.appendLE32(UInt32(height * 2)) // biHeight, doubled for the AND mask
    header.appendLE16(1) // biPlanes
    header.appendLE16(32) // biBitCount
    header.appendLE32(0) // biCompression = BI_RGB
    header.appendLE32(UInt32(xor.count + mask.count)) // biSizeImage
    header.appendLE32(0) // biXPelsPerMeter
    header.appendLE32(0) // biYPelsPerMeter
    header.appendLE32(0) // biClrUsed
    header.appendLE32(0) // biClrImportant

    var out = header
    out.append(xor)
    out.append(mask)
    return out
}

func writeICO(sizes: [Int], to path: String) {
    let frames: [(size: Int, data: Data)] = sizes.map { size in
        let ctx = renderTile(size: size)
        return (size, size == 256 ? pngData(ctx) : icoBMPFrame(ctx))
    }

    var header = Data()
    header.appendLE16(0) // reserved
    header.appendLE16(1) // type = icon
    header.appendLE16(UInt16(frames.count))

    var dirEntries = Data()
    var imageData = Data()
    var offset = UInt32(6 + frames.count * 16)
    for frame in frames {
        let byteSize = frame.size == 256 ? 0 : frame.size
        dirEntries.append(UInt8(byteSize)) // width
        dirEntries.append(UInt8(byteSize)) // height
        dirEntries.append(0) // color count
        dirEntries.append(0) // reserved
        dirEntries.appendLE16(1) // planes
        dirEntries.appendLE16(32) // bit count
        dirEntries.appendLE32(UInt32(frame.data.count))
        dirEntries.appendLE32(offset)
        offset += UInt32(frame.data.count)
        imageData.append(frame.data)
    }

    var out = header
    out.append(dirEntries)
    out.append(imageData)
    try! out.write(to: URL(fileURLWithPath: path))
}

// MARK: - Main

func resourcePath(_ name: String) -> String { "resources/" + name }

writePNG(renderTile(size: 1024), to: resourcePath("icon.png"))
writeICO(sizes: [16, 24, 32, 48, 64, 128, 256], to: resourcePath("icon.ico"))
writePNG(renderTile(size: 16), to: resourcePath("tray-icon.png"))
writePNG(renderTile(size: 32), to: resourcePath("tray-icon@2x.png"))
writePNG(renderTemplate(size: 16), to: resourcePath("trayTemplate.png"))
writePNG(renderTemplate(size: 32), to: resourcePath("trayTemplate@2x.png"))

print("Wrote icons to \(resourcePath(""))")
