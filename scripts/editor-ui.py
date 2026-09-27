"""Inspect and operate the official GP-200 editor during transfer diagnosis."""

import argparse
import ctypes as c
from ctypes import wintypes as w
import time
from PIL import ImageGrab

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("action", choices=["inspect", "file", "click", "key", "text", "close"])
parser.add_argument("values", nargs="*")
parser.add_argument("--pid", type=int)
args = parser.parse_args()
u = c.WinDLL("user32")
u.SetProcessDPIAware()
u.GetWindowTextW.argtypes = [w.HWND, w.LPWSTR, c.c_int]
u.PostMessageW.argtypes = [w.HWND, w.UINT, w.WPARAM, w.LPARAM]
windows = []


@c.WINFUNCTYPE(w.BOOL, w.HWND, w.LPARAM)
def each(hwnd, _param):
    title = c.create_unicode_buffer(512)
    u.GetWindowTextW(hwnd, title, len(title))
    if u.IsWindowVisible(hwnd):
        rect = w.RECT()
        u.GetWindowRect(hwnd, c.byref(rect))
        pid = w.DWORD()
        u.GetWindowThreadProcessId(hwnd, c.byref(pid))
        windows.append((hwnd, title.value, (rect.left, rect.top, rect.right, rect.bottom), pid.value))
    return True


u.EnumWindows(each, 0)
if args.action in ("inspect", "file"):
    @c.WINFUNCTYPE(w.BOOL, w.HWND, w.LPARAM)
    def child(hwnd, _):
        title = c.create_unicode_buffer(512)
        cls = c.create_unicode_buffer(128)
        u.GetWindowTextW(hwnd, title, len(title))
        u.GetClassNameW(hwnd, cls, len(cls))
        if cls.value in ("Edit", "Button", "ComboBox"):
            print("CONTROL", hwnd, cls.value, u.GetDlgCtrlID(hwnd), repr(title.value))
        if args.action == "file" and cls.value == "Edit" and u.GetDlgCtrlID(hwnd) == 1148:
            value = c.create_unicode_buffer(args.values[0])
            u.SendMessageW.argtypes = [w.HWND, w.UINT, w.WPARAM, w.LPARAM]
            u.SendMessageW(hwnd, 0xC, 0, c.addressof(value))
        return True
    for hwnd, title, _, pid in windows:
        if pid == args.pid and title == "Open":
            u.EnumChildWindows(hwnd, child, 0)
            if args.action == "file":
                u.PostMessageW(hwnd, 0x111, 1, 0)
for hwnd, title, rect, pid in sorted(windows, key=lambda item: -(item[2][2] - item[2][0]) * (item[2][3] - item[2][1])):
    if "GP-200" in title or (args.pid is not None and pid == args.pid):
        if args.action == "close":
            u.PostMessageW(hwnd, 0x10, 0, 0)
        elif title:
            u.ShowWindow(hwnd, 9)
            u.SetForegroundWindow(hwnd)
        print(hwnd, title, rect)

if args.action == "click":
    u.SetCursorPos(int(args.values[0]), int(args.values[1]))
    u.mouse_event(2, 0, 0, 0, 0)
    u.mouse_event(4, 0, 0, 0, 0)
elif args.action == "key":
    keys = [int(v, 0) for v in args.values]
    for key in keys:
        u.keybd_event(key, 0, 0, 0)
    for key in reversed(keys):
        u.keybd_event(key, 0, 2, 0)
elif args.action == "text":
    # WM_CHAR avoids keyboard-layout substitutions in file paths.
    gui = (c.c_byte * 72)()
    c.cast(gui, c.POINTER(w.DWORD))[0] = 72
    u.GetGUIThreadInfo(0, c.byref(gui))
    focused = c.c_void_p.from_buffer(gui, 16).value
    for char in " ".join(args.values):
        u.PostMessageW(focused, 0x102, ord(char), 0)
time.sleep(.4)
shot = ImageGrab.grab()
shot.save("desktop_probe.png")
print("Screenshot", shot.size)
