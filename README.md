# SiYuan to Anki Sync Plugin

This plugin is designed to synchronize flashcards from SiYuan Note to Anki, making it easier to leverage Anki's spaced repetition system for memorization.

[中文](./README_zh_CN.md)

## Features

- One-click synchronization of flashcards from SiYuan to Anki
- Support for both manual and automatic synchronization modes
- Customizable deck, model, and field settings
- Preserves flashcard formatting from SiYuan (HTML content supported)

## Prerequisites

1. Install [Anki](https://apps.ankiweb.net/)
2. Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on
   - In Anki, go to "Tools" -> "Add-ons" -> "Get Add-ons..."
   - Enter the code `2055492159`
   - Restart Anki

## Usage

### Basic Setup

1. Install and enable this plugin in SiYuan Note
2. Click the flashcard icon in the top toolbar (or access plugin settings from the menu)
3. Configure the following parameters:
   - Anki Connect URL: Default is `http://127.0.0.1:8765` (adjust if you've changed it)
   - Default Deck: Choose the Anki deck to export flashcards to
   - Default Model: Select the Anki note template to use
   - Front Field: Field name to store the front content of flashcards
   - Back Field: Field name to store the back content of flashcards
   - Sync Mode: Manual or automatic
   - Auto Sync Interval: If automatic mode is selected, set the time interval (in minutes)

### Synchronizing Flashcards

There are two ways to sync flashcards:

1. **Manual Sync**: Click the flashcard icon in the top toolbar
2. **Automatic Sync**: After enabling automatic sync mode, the plugin will automatically sync flashcards to Anki at the specified interval

### Sync Rules

- The plugin will synchronize all flashcards from SiYuan to the specified Anki deck
- Duplicate flashcards will be checked to avoid redundant additions
- Flashcard front and back content will maintain original formatting, with HTML content support

## Frequently Asked Questions

1. **Can't connect to Anki**
   - Make sure Anki is running
   - Ensure the AnkiConnect add-on is installed and Anki has been restarted
   - Check if the Anki Connect URL is correct

2. **Sync Failed**
   - Verify that the specified deck and model exist in Anki
   - Check the browser console logs for detailed error information

3. **Can't see new cards in Anki after sync**
   - Refresh the Anki interface (press F5)
   - Check if you're looking at the correct deck

## Development Notes

This plugin is developed using TypeScript and Svelte, with the following main functionalities:

1. Retrieving flashcard data from SiYuan Note
2. Sending data to Anki via the Anki Connect API
3. Providing a user interface for configuration and management

## License and Acknowledgements

- This plugin is released under the [MIT License](LICENSE)
- Special thanks to the SiYuan Note team and the developers of the AnkiConnect add-on

## Feedback and Suggestions

If you have any questions or suggestions, please contact us through:

- Submitting [Issues](https://github.com/username/siyuan-syak/issues) on GitHub
- Posting in the SiYuan Note community forum
