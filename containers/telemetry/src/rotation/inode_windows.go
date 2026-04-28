//go:build windows
// +build windows

package rotation

import (
	"os"
)

func extractInode(info os.FileInfo) uint64 {
	return 0
}
