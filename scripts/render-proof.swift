import AppKit
let args=CommandLine.arguments
for file in args.dropFirst(){
 guard let image=NSImage(contentsOfFile:file) else {fputs("Cannot read SVG\n",stderr);exit(2)}
 let size=image.size
 guard let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:Int(size.width),pixelsHigh:Int(size.height),bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0) else {exit(3)}
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)
 image.draw(in:NSRect(origin:.zero,size:size));NSGraphicsContext.restoreGraphicsState()
 try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:file.replacingOccurrences(of:".svg",with:".png")))
 print("Rendered \(file)")
}
exit(0)
