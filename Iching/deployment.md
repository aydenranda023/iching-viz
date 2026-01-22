# 部署指南 (GitHub Pages)

您可以非常简单地将此项目部署到手机上查看，无需购买服务器。

## 步骤 1：准备 GitHub 仓库
1.  登录 [GitHub](https://github.com/)（如果没有账号请注册）。
2.  点击右上角的 **+** 号，选择 **New repository**。
3.  **Repository name** 随便填，例如 `iching-viz`。
4.  确保选择 **Public**（公开）。
5.  点击 **Create repository**。

## 步骤 2：上传代码
您有两种方式上传代码：

### 方式 A：使用 Git 命令（如果您熟悉）
在项目根目录下打开终端：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/您的用户名/仓库名.git
git push -u origin main
```

### 方式 B：直接网页上传（如果不熟悉 Git）
1.  在刚才创建的 GitHub 仓库页面，点击 **uploading an existing file**。
2.  将项目文件夹中的所有文件（`index.html`, `js/`, `start.bat` 等）直接拖进去。
3.  等进度条走完，点击底部的 **Commit changes**。

## 步骤 3：开启 Pages 服务
1.  点击仓库顶部的 **Settings** 选项卡。
2.  在左侧菜单栏找到 **Pages**。
3.  在 **Build and deployment** 下的 **Source** 选择 **Deploy from a branch**。
4.  在 **Branch** 下选择 `main` (或 `master`)，文件夹选 `/(root)`。
5.  点击 **Save**。

## 步骤 4：在手机上访问
等待 1-2 分钟后，刷新 Pages 设置页面，您会看到顶端出现一行字：
> Your site is live at `https://您的用户名.github.io/仓库名/`

1.  复制这个链接。
2.  发送到手机微信或浏览器打开。
3.  **大功告成！**

-   **屏幕适配**：竖屏模式下，摄像机会自动拉远，确保八卦图和文字完整显示。

---

# 国内免费部署方案 (速度更快)

由于网络原因，GitHub Pages 在国内访问可能会不稳定。以下是两种更适合国内用户的方案：

## 方案一：Gitee Pages (码云) - 国内首选
Gitee 是国内的代码托管平台，访问速度极快。
1.  **注册/登录**：访问 [gitee.com](https://gitee.com/)。
2.  **导入仓库**：
    *   点击右上角 **+** -> **从 GitHub/GitLab 导入仓库**。
    *   粘贴刚才的 GitHub 仓库地址，或者直接上传代码创建一个新仓库。
3.  **开启 Pages**：
    *   进入仓库页面，点击菜单栏的 **服务** -> **Gitee Pages**。
    *   **注意**：Gitee Pages 目前需要**实名认证**（需上传身份证照片），审核通过后（通常 1 个工作日）即可免费使用。
    *   选择部署分支 `main` 或 `master`，点击 **启动**。
4.  **访问**：生成的链接（如 `https://yourname.gitee.io/iching`）在国内访问非常流畅。

## 方案二：Vercel (推荐) - 免实名，速度尚可
Vercel 是国外的服务，但拥有全球 CDN，在国内的访问速度通常比 GitHub Pages 快很多，且**不需要实名认证**。
1.  **注册**：访问 [vercel.com](https://vercel.com/)，推荐直接用 **GitHub 账号登录**。
2.  **导入项目**：
    *   在 Dashboard 点击 **Add New...** -> **Project**。
    *   在左侧列表里找到你的 GitHub 仓库 `iching-viz`，点击 **Import**。
3.  **部署**：
    *   直接点击 **Deploy** 按钮（默认设置即可）。
4.  **访问**：等待几十秒，Screen 会变成绿色庆祝画面，点击预览图即可访问。Vercel 会提供一个 `xxx.vercel.app` 的域名。
    *   *注：如果该域名在某些地区被阻断，您可以绑定自己的域名（如果有）。*

