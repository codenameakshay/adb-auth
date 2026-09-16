.PHONY: preview test build package clean

preview:
	cd macos/ADBBuddyNotch && swift run --configuration debug -Xswiftc -DENABLE_DEBUG_PREVIEW

build:
	cd macos/ADBBuddyNotch && swift build

test:
	cd macos/ADBBuddyNotch && swift test

package:
	macos/ADBBuddyNotch/package-app.sh $(VERSION)

clean:
	cd macos/ADBBuddyNotch && swift package clean
