.PHONY: preview test build clean

preview:
	cd macos/ADBBuddyNotch && swift run --configuration debug -Xswiftc -DENABLE_DEBUG_PREVIEW

build:
	cd macos/ADBBuddyNotch && swift build

test:
	cd macos/ADBBuddyNotch && swift test

clean:
	cd macos/ADBBuddyNotch && swift build --clean
