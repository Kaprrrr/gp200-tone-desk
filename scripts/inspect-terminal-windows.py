"""List visible terminal windows without changing focus or closing sessions."""
import ctypes as c
from ctypes import wintypes as w
import json

user = c.WinDLL('user32')
user.GetWindowTextW.argtypes = [w.HWND, w.LPWSTR, c.c_int]
user.GetWindowThreadProcessId.argtypes = [w.HWND, c.POINTER(w.DWORD)]
user.IsWindowVisible.argtypes = [w.HWND]

@c.WINFUNCTYPE(w.BOOL, w.HWND, w.LPARAM)
def inspect(hwnd, _):
    if user.IsWindowVisible(hwnd):
        title = c.create_unicode_buffer(512)
        user.GetWindowTextW(hwnd, title, 512)
        if any(word in title.value.lower() for word in ('powershell', 'codex', 'git.exe', 'terminal')):
            pid = w.DWORD()
            user.GetWindowThreadProcessId(hwnd, c.byref(pid))
            print(json.dumps({'hwnd': hwnd, 'pid': pid.value, 'title': title.value}))
    return True

user.EnumWindows(inspect, 0)
