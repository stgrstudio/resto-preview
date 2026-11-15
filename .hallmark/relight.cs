using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
// Relight: keep the base photo's detail (every frond, cloud and table) and take only the light from another
// photo of the same scene: out = base * blur(light) / blur(base), per channel. Used so the terrace never
// "moves" when the page or the dinner dial changes the time of day.
public static class Relight {
  static Bitmap Resize(Image src, int w, int h) { var b = new Bitmap(w, h, PixelFormat.Format24bppRgb); using (var g = Graphics.FromImage(b)) { g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality; g.DrawImage(src, 0, 0, w, h); } return b; }
  static byte[] Bytes(Bitmap b) { var d = b.LockBits(new Rectangle(0,0,b.Width,b.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb); var a = new byte[d.Stride*b.Height]; Marshal.Copy(d.Scan0, a, 0, a.Length); b.UnlockBits(d); return a; }
  public static void Run(string basePath, string lightPath, string outPath, int blurW, long quality) {
    var baseImg = Image.FromFile(basePath); var lightImg = Image.FromFile(lightPath);
    int W = baseImg.Width, H = baseImg.Height, bw = blurW, bh = (int)Math.Round(blurW * (double)H / W);
    var B = Resize(baseImg, W, H); var bBlur = Resize(Resize(baseImg, bw, bh), W, H); var lBlur = Resize(Resize(lightImg, bw, bh), W, H);
    var pb = Bytes(B); var pbb = Bytes(bBlur); var plb = Bytes(lBlur); var o = new byte[pb.Length];
    for (int i = 0; i < pb.Length; i++) { double v = pb[i] * (plb[i] + 6.0) / (pbb[i] + 6.0); o[i] = (byte)(v < 0 ? 0 : v > 255 ? 255 : v); }
    var outB = new Bitmap(W, H, PixelFormat.Format24bppRgb);
    var d = outB.LockBits(new Rectangle(0,0,W,H), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb); Marshal.Copy(o, 0, d.Scan0, o.Length); outB.UnlockBits(d);
    var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg");
    var ps = new EncoderParameters(1); ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
    outB.Save(outPath, enc, ps);
    foreach (var x in new IDisposable[]{baseImg, lightImg, B, bBlur, lBlur, outB}) x.Dispose();
  }
}
