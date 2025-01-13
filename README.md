# 🔄 LeetCode GitHub Sync

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> Keep your LeetCode solutions automatically synced to GitHub! Never lose track of your coding progress again.

## 🎥 Demo

![Demo](https://github.com/oseni99/LeetcodeGitHubSync/blob/main/final_demo.gif?raw=true)

## ✨ Features

- 🤖 **Automatic Syncing** - Your solutions are synced to GitHub every 5 minutes while browsing LeetCode
- 🔄 **Manual Sync** - One-click sync button for immediate updates
- 🎯 **Smart Duplicate Detection** - No redundant commits, only meaningful changes
- 🔔 **Real-time Notifications** - Stay informed about sync status through Chrome notifications

## 🚀 Quick Start

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/oseni99/leetcode-github-sync.git
   ```

2. Open Chrome Extensions:
   - Navigate to `chrome://extensions/`
   - Toggle on "Developer Mode" in the top-right corner
   - Click "Load unpacked" and select the cloned directory

### Configuration

1. **Access Options**

   - Click the extension icon in your browser
   - Select "Options" from the dropdown

2. **Setup GitHub Integration**
   ```json
   {
     "repository": "https://github.com/your-username/your-repo",
     "token": "your-github-personal-access-token"
   }
   ```
   > 🔒 Make sure your Personal Access Token (PAT) has the `repo` scope

## 🎮 Usage

### Automatic Mode

- Simply browse LeetCode as usual
- The extension checks for new submissions every 5 minutes
- Your solutions are automatically pushed to GitHub

### Manual Mode

1. Solve a problem on LeetCode
2. Click the extension icon
3. Hit "Sync Now" to push your solution

## 🔧 Troubleshooting

| Issue               | Solution                                                |
| ------------------- | ------------------------------------------------------- |
| 403 Error           | Ensure you're logged into LeetCode and refresh the page |
| No Changes Detected | Solution already exists in repo with identical content  |
| Sync Failed         | Check your GitHub PAT permissions                       |

## 🤝 Contributing

We love your input! We want to make contributing as easy and transparent as possible:

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add something amazing'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT © [oseni99](https://github.com/oseni99)

---

<div align="center">
Made with ❤️ for LeetCode enthusiasts
</div>
