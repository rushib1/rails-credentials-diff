# rails-credentials-diff README

This extension provides a way to resolve merge conflicts in credentials.

## Features

This extension adds two commands to help make resolving resolution conflicts for encrypted credentials easy.

Steps:
1. Open the credentials file with conflicts and run the command `Diff Credentials` and you are prompted to enter your `MASTER_KEY`.

2. After which it will prompt a diff view where you can resolve all the conflicts.

3. Run the command `Save Credentials Diff` select the file path where you want to save this diff and enter your `MASTER_KEY` again to complete the process.

![](https://github.com/rushib1/rails-credentials-diff/blob/master/credentials_diff_tutorial.gif)

## Release Notes
### 0.0.1

Initial release of rails credential diffing.

