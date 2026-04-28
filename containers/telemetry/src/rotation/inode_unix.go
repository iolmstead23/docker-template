//go:build linux || darwin || freebsd
// +build linux darwin freebsd

package rotation

import (
	"os"
	"syscall"
)

func extractInode(info os.FileInfo) uint64 {
	return info.Sys().(*syscall.Stat_t).Ino
}
