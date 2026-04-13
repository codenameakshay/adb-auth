import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins

enum QRCodeRenderer {
    static func image(from string: String, dimension: CGFloat) -> NSImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"

        guard let outputImage = filter.outputImage else {
            return nil
        }

        let scaleX = dimension / outputImage.extent.width
        let scaleY = dimension / outputImage.extent.height
        let transformed = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))

        let rep = NSCIImageRep(ciImage: transformed)
        let image = NSImage(size: NSSize(width: dimension, height: dimension))
        image.addRepresentation(rep)
        return image
    }
}
