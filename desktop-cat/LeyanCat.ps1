# 樂衍小黑貓（桌面版）：在桌面走動，點一下彈出小黑貓助手。右鍵可以餵零食、玩逗貓棒。
# 需要 Windows 內建的 PowerShell 5.1 以上，不用安裝其他軟體。
param([string]$Base = "https://rou0212.github.io/customer-help/")

$code = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class LeyanCatPet : Form
{
    [StructLayout(LayoutKind.Sequential)] struct PT { public int x, y; public PT(int a, int b) { x = a; y = b; } }
    [StructLayout(LayoutKind.Sequential)] struct SZ { public int cx, cy; public SZ(int a, int b) { cx = a; cy = b; } }
    [StructLayout(LayoutKind.Sequential, Pack = 1)] struct BLEND { public byte Op, Flags, Alpha, Format; }
    [DllImport("user32.dll")] static extern bool UpdateLayeredWindow(IntPtr h, IntPtr dst, ref PT pos, ref SZ size, IntPtr src, ref PT srcPos, int key, ref BLEND b, int flags);
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr h);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr h, IntPtr dc);
    [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc, IntPtr obj);
    [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr obj);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string cls, string title);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [StructLayout(LayoutKind.Sequential)] struct LASTINPUT { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUT li);
    static uint IdleMs() { LASTINPUT li = new LASTINPUT(); li.cbSize = (uint)Marshal.SizeOf(li); if (!GetLastInputInfo(ref li)) return 0; return (uint)Environment.TickCount - li.dwTime; }
    bool idleSleep = false;
    const string ChatTitle = "\u6a02\u884d\u5c0f\u9ed1\u8c93";
    int chatX, chatY, chatWait = 0;
    static System.Threading.EventWaitHandle quit;

    const int W = 210, H = 150, CAT_W = 110;
    static readonly Color Ink = Color.FromArgb(255, 21, 25, 30);
    static readonly Color Eye = Color.FromArgb(255, 246, 201, 69);
    static readonly Color Pink = Color.FromArgb(255, 232, 160, 168);

    string baseUrl, scriptPath;
    Timer timer = new Timer();
    Random rnd = new Random();
    double x, vy;
    int dir = 1, state = 0, stateTicks = 60, frame = 0, tick = 0, bubbleTicks = 0, blinkTicks = 0;
    bool resting = false, dragging = false, mouseDown = false, falling = false;
    Point downScreen, downLoc;
    NotifyIcon tray;
    ToolStripMenuItem restItem, startupItem;
    // state: 0 走路, 1 坐下, 2 站著發呆, 3 睡覺
    // mode: 0 平常, 1 吃零食, 2 玩逗貓棒
    int mode = 0, modeTicks = 0, bites = 0, heartTicks = 0, snacks = 0;
    double hopY = 0, hopV = 0, py = 0;
    string bubbleText = "需要幫忙嗎？點我！";
    ToolStripMenuItem playItem;
    WandForm wand;
    const int PLAY_TICKS = 400;

    public LeyanCatPet(string url, string script)
    {
        baseUrl = url; scriptPath = script;
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false; TopMost = true;
        StartPosition = FormStartPosition.Manual;
        Size = new Size(W, H);
        Rectangle wa = Screen.PrimaryScreen.WorkingArea;
        x = wa.Left + wa.Width * 0.7;
        Location = new Point((int)x, GroundTop(wa));
        BuildMenu();
        timer.Interval = 40;
        timer.Tick += delegate { Step(); };
        MouseDown += OnDown; MouseMove += OnMove; MouseUp += OnUp;
        Say("需要幫忙嗎？點我！", 120);
    }

    void Say(string text, int ticks) { bubbleText = text; bubbleTicks = ticks; }

    // ---------- 餵零食 ----------
    void StartFeed()
    {
        if (mode == 2) EndPlay();
        idleSleep = false; mode = 1; modeTicks = 0; bites = 0; bubbleTicks = 0; SetState(1, 9999);
    }

    void FeedStep()
    {
        modeTicks++;
        if (modeTicks == 30 || modeTicks == 50 || modeTicks == 70) bites++;
        if (modeTicks == 30) Say("喵～", 18);
        if (modeTicks == 92)
        {
            snacks++;
            string[] lines = { "好好吃～謝謝你！", "還想再吃一個！", "吃飽了，繼續幫你查問題！" };
            Say(snacks >= 4 ? "吃太多會變胖胖啦～" : lines[rnd.Next(lines.Length)], 75);
            heartTicks = 60;
        }
        if (modeTicks >= 100) { mode = 0; SetState(1, resting ? 99999 : 120); }
    }

    // ---------- 玩逗貓棒 ----------
    void StartPlay()
    {
        mode = 0; idleSleep = false;
        if (wand == null) wand = new WandForm();
        mode = 2; modeTicks = 0; hopY = 0; hopV = 0; py = Top; x = Left;
        playItem.Text = "收起逗貓棒";
        wand.Show(); wand.Follow();
        Say("喵！那是什麼！", 40);
    }

    void EndPlay()
    {
        if (mode != 2) return;
        mode = 0; hopY = 0; hopV = 0;
        playItem.Text = "玩逗貓棒";
        if (wand != null) wand.Hide();
        falling = true; vy = 0;
        Say("好好玩！下次再陪我玩～", 70);
        heartTicks = 40;
        SetState(1, resting ? 99999 : 140);
    }

    void PlayStep(Rectangle wa, int ground)
    {
        modeTicks++;
        if (modeTicks > PLAY_TICKS) { EndPlay(); return; }
        wand.Follow();
        Point c = Cursor.Position;
        Rectangle sb = Screen.FromPoint(c).Bounds;
        // 目標：逗貓棒羽毛正下方，整個螢幕都追得到
        double tx = Math.Max(sb.Left - 20, Math.Min(sb.Right - W + 20, c.X - W / 2.0));
        double ty = Math.Max(sb.Top - 40, Math.Min(sb.Bottom - H + 4, c.Y + 26 - (H - 92)));
        double dx = tx - x, dy = ty - py, d = Math.Sqrt(dx * dx + dy * dy);
        if (d > 8)
        {
            double sp = Math.Min(d, Math.Max(3.0, Math.Min(12.0, d * 0.12)));
            x += dx / d * sp; py += dy / d * sp;
            if (Math.Abs(dx) > 4) dir = dx > 0 ? 1 : -1;
            state = 0;
            if (tick % 2 == 0) frame = (frame + 1) % 4;
        }
        else state = 2;
        if (hopY <= 0 && hopV <= 0 && d < 60 && rnd.Next(9) == 0) hopV = 8 + rnd.Next(5);
        if (hopV != 0 || hopY > 0)
        {
            hopY += hopV; hopV -= 1.1;
            if (hopY <= 0) { hopY = 0; hopV = 0; }
        }
        if (hopY > 18 && d < 40 && bubbleTicks == 0 && rnd.Next(3) == 0) Say("抓到了！", 25);
        else if (bubbleTicks == 0 && rnd.Next(90) == 0) Say(rnd.Next(2) == 0 ? "喵！" : "喵喵喵！", 20);
        Location = new Point((int)x, (int)(py - hopY));
    }

    // 跟著滑鼠的逗貓棒（不會擋到滑鼠點擊）
    class WandForm : Form
    {
        const int S = 96;
        public WandForm()
        {
            FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = true;
            StartPosition = FormStartPosition.Manual; Size = new Size(S, S);
        }
        protected override CreateParams CreateParams
        {
            get { CreateParams cp = base.CreateParams; cp.ExStyle |= 0x80000 | 0x20 | 0x80 | 0x8; return cp; }
        }
        protected override bool ShowWithoutActivation { get { return true; } }
        public void Follow()
        {
            Point c = Cursor.Position;
            Location = new Point(c.X - 18, c.Y - 18);
            using (Bitmap bmp = new Bitmap(S, S, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
            {
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    float sw = (float)Math.Sin(Environment.TickCount / 120.0) * 3f;
                    using (Pen stick = new Pen(Color.FromArgb(255, 139, 94, 52), 4f)) { stick.StartCap = LineCap.Round; stick.EndCap = LineCap.Round; g.DrawLine(stick, 22, 22, S - 6, S - 6); }
                    using (Pen str = new Pen(Color.FromArgb(255, 90, 90, 90), 1.5f)) g.DrawLine(str, 22, 22, 18 + sw, 30);
                    Color[] cs = { Color.FromArgb(255, 231, 76, 60), Color.FromArgb(255, 241, 196, 15), Color.FromArgb(255, 52, 152, 219), Color.FromArgb(255, 155, 89, 182) };
                    for (int i = 0; i < 4; i++)
                    {
                        GraphicsState st = g.Save();
                        g.TranslateTransform(18 + sw, 32);
                        g.RotateTransform(-60 + i * 40 + sw * 3);
                        using (SolidBrush b = new SolidBrush(cs[i])) g.FillEllipse(b, -4, 0, 8, 24);
                        g.Restore(st);
                    }
                    using (SolidBrush b = new SolidBrush(Color.FromArgb(255, 241, 196, 15))) g.FillEllipse(b, 13 + sw, 26, 10, 10);
                }
                ApplyBitmap(this, bmp);
            }
        }
    }


    protected override CreateParams CreateParams
    {
        get { CreateParams cp = base.CreateParams; cp.ExStyle |= 0x80000 | 0x80 | 0x8; return cp; }
    }

    protected override void OnLoad(EventArgs e) { base.OnLoad(e); Render(); timer.Start(); }

    int GroundTop(Rectangle wa) { return wa.Bottom - H + 4; }

    void BuildMenu()
    {
        ContextMenuStrip m = new ContextMenuStrip();
        m.Items.Add("問小黑貓", null, delegate { OpenChat(); });
        m.Items.Add(new ToolStripSeparator());
        m.Items.Add("餵零食", null, delegate { StartFeed(); });
        playItem = new ToolStripMenuItem("玩逗貓棒", null, delegate { if (mode == 2) EndPlay(); else StartPlay(); });
        m.Items.Add(playItem);
        m.Items.Add(new ToolStripSeparator());
        restItem = new ToolStripMenuItem("休息一下（不要走動）", null, delegate { resting = !resting; restItem.Checked = resting; if (resting) SetState(1, 99999); else SetState(0, 80); });
        m.Items.Add(restItem);
        m.Items.Add("打開手冊網站", null, delegate { Launch(baseUrl); });
        startupItem = new ToolStripMenuItem("開機自動啟動", null, delegate { ToggleStartup(); });
        startupItem.Checked = File.Exists(StartupFile());
        m.Items.Add(startupItem);
        m.Items.Add(new ToolStripSeparator());
        m.Items.Add("結束小黑貓", null, delegate { tray.Visible = false; if (wand != null) wand.Hide(); Application.Exit(); });
        ContextMenuStrip = m;
        tray = new NotifyIcon();
        tray.Text = "樂衍小黑貓";
        tray.ContextMenuStrip = m;
        using (Bitmap b = new Bitmap(64, 64))
        using (Graphics g = Graphics.FromImage(b))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.ScaleTransform(0.58f, 0.58f);
            DrawSit(g, -2, 4, false);
            tray.Icon = Icon.FromHandle(b.GetHicon());
        }
        tray.Visible = true;
        tray.MouseClick += delegate(object s, MouseEventArgs e) { if (e.Button == MouseButtons.Left) OpenChat(); };
    }

    string StartupFile() { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), "LeyanCat.bat"); }

    void ToggleStartup()
    {
        string f = StartupFile();
        try
        {
            if (File.Exists(f)) File.Delete(f);
            else File.WriteAllText(f, "@echo off\r\nstart \"\" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + scriptPath + "\"\r\n", System.Text.Encoding.Default);
        }
        catch (Exception ex) { MessageBox.Show(ex.Message); }
        startupItem.Checked = File.Exists(f);
    }

    void SetState(int s, int ticks) { state = s; stateTicks = ticks; }

    void Step()
    {
        tick++;
        if (quit != null && quit.WaitOne(0)) { timer.Stop(); tray.Visible = false; Application.Exit(); return; }
        if (chatWait > 0)
        {
            chatWait--;
            IntPtr h = FindWindow(null, ChatTitle);
            if (h != IntPtr.Zero) { chatWait = 0; PlaceChat(h); }
        }
        Rectangle wa = Screen.FromPoint(new Point(Left + W / 2, Top + H / 2)).WorkingArea;
        int ground = GroundTop(wa);
        if (dragging) { Render(); return; }
        if (falling)
        {
            vy += 1.4; int ny = Top + (int)vy;
            if (ny >= ground) { ny = ground; falling = false; vy = 0; SetState(2, 25); }
            Top = ny; Render(); return;
        }
        if (blinkTicks > 0) blinkTicks--; else if (rnd.Next(110) == 0) blinkTicks = 4;
        if (bubbleTicks > 0) bubbleTicks--;
        if (heartTicks > 0) heartTicks--;
        if (mode == 1) { FeedStep(); if (Top != ground) Top = ground; Render(); return; }
        if (mode == 2) { PlayStep(wa, ground); Render(); return; }
        if (Top != ground) Top = ground;
        // 電腦 30 秒沒人動 → 睡覺；有人動滑鼠鍵盤 → 醒來
        if (tick % 25 == 0)
        {
            uint idle = IdleMs();
            if (idle > 30000 && state != 3) { SetState(3, 999999); idleSleep = true; bubbleTicks = 0; }
            else if (idle < 1500 && idleSleep) { idleSleep = false; SetState(1, resting ? 99999 : 60); Say("喵…（伸懶腰）", 50); }
        }
        if (!resting && state != 3 && --stateTicks <= 0)
        {
            int r = rnd.Next(100);
            if (r < 55) { if (rnd.Next(3) == 0) dir = -dir; SetState(0, 80 + rnd.Next(160)); }
            else if (r < 80) { SetState(1, 90 + rnd.Next(150)); if (rnd.Next(2) == 0) Say("需要幫忙嗎？點我！", 90); }
            else if (r < 90) SetState(2, 30 + rnd.Next(50));
            else { SetState(3, 750 + rnd.Next(1500)); bubbleTicks = 0; }
        }
        if (state == 3 && !idleSleep && --stateTicks <= 0) { SetState(1, 80); Say("睡飽了～", 40); }
        if (state == 0)
        {
            x += 1.7 * dir;
            if (x < wa.Left - 20) { x = wa.Left - 20; dir = 1; }
            if (x > wa.Right - W + 20) { x = wa.Right - W + 20; dir = -1; }
            Left = (int)x;
            if (tick % 4 == 0) frame = (frame + 1) % 4;
        }
        Render();
    }

    void OnDown(object s, MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left) return;
        mouseDown = true; dragging = false; downScreen = Cursor.Position; downLoc = Location;
    }

    void OnMove(object s, MouseEventArgs e)
    {
        if (!mouseDown) return;
        Point p = Cursor.Position;
        if (!dragging && (Math.Abs(p.X - downScreen.X) > 4 || Math.Abs(p.Y - downScreen.Y) > 4)) dragging = true;
        if (dragging) { if (mode == 2) EndPlay(); if (mode == 1) mode = 0; hopY = 0; Location = new Point(downLoc.X + p.X - downScreen.X, downLoc.Y + p.Y - downScreen.Y); x = Left; }
    }

    void OnUp(object s, MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left || !mouseDown) return;
        mouseDown = false;
        if (dragging) { dragging = false; falling = true; vy = 0; }
        else if (mode == 2) Say("抓到了！喵～", 35);
        else if (mode == 1) { }
        else if (state == 3) { idleSleep = false; SetState(1, 120); Say("喵？我醒了！", 40); }
        else OpenChat();
    }

    void OpenChat()
    {
        if (!resting) SetState(1, 400);
        bubbleTicks = 0;
        Rectangle wa = Screen.FromControl(this).WorkingArea;
        int cw = 400, ch = 600;
        int cx = Math.Max(wa.Left, Math.Min(wa.Right - cw, Left + W / 2 - cw / 2));
        int cy = Math.Max(wa.Top, Top - ch + 30);
        chatX = cx; chatY = cy;
        IntPtr existing = FindWindow(null, ChatTitle);
        if (existing != IntPtr.Zero) { PlaceChat(existing); return; }
        chatWait = 100;
        string url = baseUrl + "cat.html";
        string edge = FindEdge();
        try
        {
            if (edge != null) Process.Start(edge, "--app=" + url + " --window-size=" + cw + "," + ch + " --window-position=" + cx + "," + cy);
            else Launch(url);
        }
        catch { Launch(url); }
    }

    void PlaceChat(IntPtr h)
    {
        ShowWindow(h, 9);
        SetWindowPos(h, IntPtr.Zero, chatX, chatY, 400, 600, 0x0040);
        SetForegroundWindow(h);
    }

    static string FindEdge()
    {
        string[] dirs = { Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) };
        foreach (string d in dirs)
        {
            if (string.IsNullOrEmpty(d)) continue;
            string p = Path.Combine(d, @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(p)) return p;
        }
        return null;
    }

    static void Launch(string url) { try { Process.Start(url); } catch { } }

    void Render()
    {
        using (Bitmap bmp = new Bitmap(W, H, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                float ox = (W - CAT_W) / 2f, oy = H - 92;
                bool eating = mode == 1 && modeTicks > 18 && modeTicks < 92;
                float munch = eating && (modeTicks / 4) % 2 == 0 ? 3f : 0f;
                if (mode == 1 && modeTicks < 100) DrawTreat(g, ox + 78, oy, modeTicks, bites);
                if (state == 3 && mode == 0 && !dragging && !falling) DrawSleep(g, ox, oy);
                else if (state == 1 || state == 3 || dragging || falling) DrawSit(g, ox, oy + munch, blinkTicks > 0 || eating);
                else DrawWalk(g, ox, oy, dir > 0, (state == 0 || hopY > 0) ? frame : 1, blinkTicks > 0);
                if (heartTicks > 0) DrawHearts(g, heartTicks);
                if (bubbleTicks > 0 && !dragging) DrawBubble(g, bubbleText);
            }
            Apply(bmp);
        }
    }

    void DrawTreat(Graphics g, float tx, float oy, int t, int b)
    {
        using (SolidBrush plate = new SolidBrush(Color.FromArgb(255, 220, 226, 232))) g.FillEllipse(plate, tx - 6, oy + 84, 44, 8);
        if (b >= 3) return;
        float ty = oy + 74;
        if (t < 16) ty = oy + 74 - (16 - t) * (16 - t) * 0.35f;
        float w = 30f * (3 - b) / 3f;
        using (SolidBrush fish = new SolidBrush(Color.FromArgb(255, 240, 140, 60)))
        using (SolidBrush dark = new SolidBrush(Ink))
        {
            if (b < 2) g.FillPolygon(fish, new PointF[] { new PointF(tx + w - 2, ty + 5), new PointF(tx + w + 8, ty - 1), new PointF(tx + w + 8, ty + 11) });
            g.FillEllipse(fish, tx, ty, w, 11);
            if (b == 0) g.FillEllipse(dark, tx + 4, ty + 3, 3, 3);
        }
    }

    void DrawSleep(Graphics g, float ox, float oy)
    {
        GraphicsState gs = g.Save();
        g.TranslateTransform(ox, oy);
        float br = (float)Math.Sin(tick / 12.0) * 1.5f;
        using (SolidBrush ink = new SolidBrush(Ink))
        using (SolidBrush pink = new SolidBrush(Pink))
        using (Pen tailPen = new Pen(Ink, 8f))
        using (Pen eyeLine = new Pen(Color.FromArgb(255, 246, 201, 69), 2f))
        {
            tailPen.StartCap = LineCap.Round; tailPen.EndCap = LineCap.Round;
            // 身體（隨呼吸起伏）
            g.FillEllipse(ink, 22, 58 - br, 74, 32 + br);
            // 尾巴繞到前面
            g.DrawBezier(tailPen, 92, 76, 106, 84, 78, 88, 46, 85);
            // 頭趴在前面
            g.FillEllipse(ink, 10, 52, 40, 34);
            g.FillPolygon(ink, new PointF[] { new PointF(13, 62), new PointF(14, 42), new PointF(26, 54) });
            g.FillPolygon(ink, new PointF[] { new PointF(32, 53), new PointF(44, 42), new PointF(47, 61) });
            g.FillPolygon(pink, new PointF[] { new PointF(17, 58), new PointF(17, 48), new PointF(24, 55) });
            g.FillPolygon(pink, new PointF[] { new PointF(35, 54), new PointF(42, 48), new PointF(44, 58) });
            // 閉著的眼睛
            g.DrawArc(eyeLine, 17, 66, 8, 5, 0, 180); g.DrawArc(eyeLine, 31, 66, 8, 5, 0, 180);
            g.FillPolygon(pink, new PointF[] { new PointF(26, 75), new PointF(31, 75), new PointF(28.5f, 77.5f) });
        }
        // Zzz 往上飄
        {
            for (int i = 0; i < 3; i++)
            {
                int ph = (tick + i * 20) % 60;
                int a = ph < 10 ? ph * 25 : Math.Max(0, 255 - (ph - 10) * 5);
                using (SolidBrush zb = new SolidBrush(Color.FromArgb(a, 91, 100, 112)))
                using (Font fz = new Font("Arial", 9f + i * 2.5f, FontStyle.Bold))
                    g.DrawString("z", fz, zb, 46 + ph * 0.4f + i * 6, 40 - ph * 0.6f - i * 4);
            }
        }
        g.Restore(gs);
    }

    void DrawHearts(Graphics g, int t)
    {
        using (SolidBrush pk = new SolidBrush(Color.FromArgb(Math.Min(255, t * 8), 231, 76, 110)))
        {
            for (int i = 0; i < 3; i++)
            {
                float hx = 40 + i * 52 + (float)Math.Sin((t + i * 20) / 5.0) * 4f;
                float hy = 30 + t * 0.9f - i * 8;
                if (hy < 26 || hy > H - 30) continue;
                g.FillEllipse(pk, hx, hy, 9, 9); g.FillEllipse(pk, hx + 7, hy, 9, 9);
                g.FillPolygon(pk, new PointF[] { new PointF(hx + 0.5f, hy + 6), new PointF(hx + 15.5f, hy + 6), new PointF(hx + 8, hy + 15) });
            }
        }
    }

    void Apply(Bitmap bmp) { ApplyBitmap(this, bmp); }

    static void ApplyBitmap(Form f, Bitmap bmp)
    {

        IntPtr screen = GetDC(IntPtr.Zero), mem = CreateCompatibleDC(screen), hb = IntPtr.Zero, old = IntPtr.Zero;
        try
        {
            hb = bmp.GetHbitmap(Color.FromArgb(0));
            old = SelectObject(mem, hb);
            SZ size = new SZ(bmp.Width, bmp.Height); PT src = new PT(0, 0); PT pos = new PT(f.Left, f.Top);
            BLEND b = new BLEND(); b.Op = 0; b.Flags = 0; b.Alpha = 255; b.Format = 1;
            UpdateLayeredWindow(f.Handle, screen, ref pos, ref size, mem, ref src, 0, ref b, 2);
        }
        finally
        {
            ReleaseDC(IntPtr.Zero, screen);
            if (hb != IntPtr.Zero) { SelectObject(mem, old); DeleteObject(hb); }
            DeleteDC(mem);
        }
    }

    void DrawBubble(Graphics g, string text)
    {
        using (Font f = new Font("Microsoft JhengHei", 11f, FontStyle.Bold))
        {
            SizeF ts = g.MeasureString(text, f);
            float bw = ts.Width + 20, bh = ts.Height + 12, bx = (W - bw) / 2f, by = 4;
            using (GraphicsPath p = new GraphicsPath())
            {
                float r = 10;
                p.AddArc(bx, by, r * 2, r * 2, 180, 90); p.AddArc(bx + bw - r * 2, by, r * 2, r * 2, 270, 90);
                p.AddArc(bx + bw - r * 2, by + bh - r * 2, r * 2, r * 2, 0, 90); p.AddArc(bx, by + bh - r * 2, r * 2, r * 2, 90, 90);
                p.CloseFigure();
                g.FillPath(Brushes.White, p);
                using (Pen pen = new Pen(Ink, 2f)) g.DrawPath(pen, p);
                PointF[] tail = { new PointF(W / 2f - 7, by + bh - 1), new PointF(W / 2f + 7, by + bh - 1), new PointF(W / 2f, by + bh + 9) };
                g.FillPolygon(Brushes.White, tail);
                using (Pen pen = new Pen(Ink, 2f)) { g.DrawLine(pen, tail[0], tail[2]); g.DrawLine(pen, tail[1], tail[2]); }
            }
            using (SolidBrush tb = new SolidBrush(Ink)) g.DrawString(text, f, tb, bx + 10, by + 6);
        }
    }

    void DrawWalk(Graphics g, float ox, float oy, bool right, int fr, bool blink)
    {
        GraphicsState gs = g.Save();
        if (right) g.TranslateTransform(ox, oy); else { g.TranslateTransform(ox + CAT_W, oy); g.ScaleTransform(-1, 1); }
        using (SolidBrush ink = new SolidBrush(Ink))
        using (SolidBrush eye = new SolidBrush(Eye))
        using (SolidBrush pink = new SolidBrush(Pink))
        using (Pen tailPen = new Pen(Ink, 8f))
        {
            tailPen.StartCap = LineCap.Round; tailPen.EndCap = LineCap.Round;
            float sway = (float)Math.Sin(tick / 6.0) * 6f;
            g.DrawBezier(tailPen, 24, 58, 6, 54, -2 + sway, 30, 12 + sway, 16);
            float a = (fr == 0) ? 4 : (fr == 2 ? -4 : 0), la = (fr == 0) ? 3 : 0, lb = (fr == 2) ? 3 : 0;
            g.FillRectangle(ink, 27 + a, 64 - la, 9, 24); g.FillRectangle(ink, 39 - a, 64 - lb, 9, 24);
            g.FillRectangle(ink, 64 - a, 64 - lb, 9, 24); g.FillRectangle(ink, 76 + a, 64 - la, 9, 24);
            g.FillEllipse(ink, 16, 44, 70, 32);
            g.FillEllipse(ink, 64, 20, 38, 36);
            g.FillPolygon(ink, new PointF[] { new PointF(67, 32), new PointF(70, 8), new PointF(82, 24) });
            g.FillPolygon(ink, new PointF[] { new PointF(86, 24), new PointF(98, 8), new PointF(100, 32) });
            g.FillPolygon(pink, new PointF[] { new PointF(71, 27), new PointF(72, 15), new PointF(79, 24) });
            g.FillPolygon(pink, new PointF[] { new PointF(89, 24), new PointF(96, 15), new PointF(97, 27) });
            DrawEyes(g, eye, ink, 77, 33, 90, 33, blink);
            g.FillPolygon(pink, new PointF[] { new PointF(97, 44), new PointF(103, 44), new PointF(100, 47) });
            using (Pen w = new Pen(Color.FromArgb(255, 138, 145, 153), 1.4f)) { g.DrawLine(w, 96, 47, 110, 44); g.DrawLine(w, 96, 49, 110, 51); }
        }
        g.Restore(gs);
    }

    void DrawSit(Graphics g, float ox, float oy, bool blink)
    {
        GraphicsState gs = g.Save();
        g.TranslateTransform(ox, oy);
        using (SolidBrush ink = new SolidBrush(Ink))
        using (SolidBrush eye = new SolidBrush(Eye))
        using (SolidBrush pink = new SolidBrush(Pink))
        using (Pen tailPen = new Pen(Ink, 8f))
        {
            tailPen.StartCap = LineCap.Round; tailPen.EndCap = LineCap.Round;
            float sway = (float)Math.Sin(tick / 8.0) * 4f;
            g.DrawBezier(tailPen, 70, 84, 92, 88, 104, 80, 100 + sway, 62);
            g.FillEllipse(ink, 31, 44, 50, 44);
            g.FillEllipse(ink, 38, 80, 14, 9); g.FillEllipse(ink, 60, 80, 14, 9);
            g.FillEllipse(ink, 35, 12, 42, 38);
            g.FillPolygon(ink, new PointF[] { new PointF(37, 26), new PointF(39, 2), new PointF(53, 16) });
            g.FillPolygon(ink, new PointF[] { new PointF(59, 16), new PointF(73, 2), new PointF(75, 26) });
            g.FillPolygon(pink, new PointF[] { new PointF(41, 20), new PointF(42, 9), new PointF(50, 16) });
            g.FillPolygon(pink, new PointF[] { new PointF(62, 16), new PointF(70, 9), new PointF(71, 20) });
            DrawEyes(g, eye, ink, 45, 25, 59, 25, blink);
            g.FillPolygon(pink, new PointF[] { new PointF(53, 37), new PointF(59, 37), new PointF(56, 40) });
            using (Pen w = new Pen(Color.FromArgb(255, 138, 145, 153), 1.4f))
            { g.DrawLine(w, 44, 39, 30, 37); g.DrawLine(w, 44, 42, 31, 44); g.DrawLine(w, 68, 39, 82, 37); g.DrawLine(w, 68, 42, 81, 44); }
        }
        g.Restore(gs);
    }

    static void DrawEyes(Graphics g, Brush eye, Brush ink, float x1, float y1, float x2, float y2, bool blink)
    {
        if (blink)
        {
            using (Pen p = new Pen(Color.FromArgb(255, 246, 201, 69), 2f)) { g.DrawLine(p, x1, y1 + 5, x1 + 8, y1 + 5); g.DrawLine(p, x2, y2 + 5, x2 + 8, y2 + 5); }
            return;
        }
        g.FillEllipse(eye, x1, y1, 8, 10); g.FillEllipse(eye, x2, y2, 8, 10);
        g.FillEllipse(ink, x1 + 2.8f, y1 + 1.5f, 2.6f, 7); g.FillEllipse(ink, x2 + 2.8f, y2 + 1.5f, 2.6f, 7);
    }

    public static void Run(string url, string script)
    {
        bool created;
        using (System.Threading.Mutex mx = new System.Threading.Mutex(true, "LeyanCatPet_Single", out created))
        {
            quit = new System.Threading.EventWaitHandle(false, System.Threading.EventResetMode.ManualReset, "LeyanCatPet_Quit");
            if (!created)
            {
                // 已經有一隻在跑：請舊的那隻結束，換成新版本
                quit.Set();
                bool got = false;
                try { got = mx.WaitOne(6000); } catch (System.Threading.AbandonedMutexException) { got = true; }
                if (!got) return;
            }
            quit.Reset();
            Application.EnableVisualStyles();
            Application.Run(new LeyanCatPet(url, script));
        }
    }
}
'@

$log = Join-Path $PSScriptRoot "LeyanCat-error.log"
try {
    Add-Type -TypeDefinition $code -Language CSharp -ReferencedAssemblies System.Windows.Forms, System.Drawing -ErrorAction Stop
    [LeyanCatPet]::Run($Base, $PSCommandPath)
} catch {
    ($_ | Out-String) + "`r`n" + ($_.Exception | Out-String) | Set-Content -Path $log -Encoding UTF8
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("小黑貓啟動失敗，錯誤已存到：`r`n$log", "樂衍小黑貓") | Out-Null
}
