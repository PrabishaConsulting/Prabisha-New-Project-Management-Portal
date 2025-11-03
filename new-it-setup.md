# Team Git Workflow Guide

**Official Git workflow for all team members**

---

## 📋 Table of Contents
1. [Standard Workflow](#standard-workflow)
2. [Team Branch Examples](#team-branch-examples)
3. [Common Git Commands](#common-git-commands)
4. [Team Rules](#team-rules)
5. [Documentation Standards](#documentation-standards)
6. [Responsibilities](#responsibilities)
7. [Quick Recap](#quick-recap)
8. [Tips for New Members](#tips-for-new-members)

---

## 🔄 Standard Workflow

### Step 1: Get the Latest Code
```bash
git checkout dev
git pull origin dev
```

### Step 2: Create Your Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### Step 3: Make Your Changes
- Edit your code locally
- Test thoroughly
- Commit regularly

### Step 4: Commit & Push
```bash
git add .
git commit -m "Added new dashboard UI"
git push origin feature/your-feature-name
```

### Step 5: Create a Pull Request (PR)
1. Go to GitHub → Company repository
2. Create PR from your branch → `dev`
3. Add clear description of changes
4. Tag a teammate for code review

### Step 6: Review & Merge
- After review and approval → Merge into `dev`
- Once stable → `dev` → `main` → Auto-deploys to Vercel

---

## 🧩 Team Branch Examples

| Team Member | Example Branch | Example PR Description |
|------------|----------------|------------------------|
| Devdeep | `feature/auth-system` | "Added login & JWT authentication" |
| Firoz | `feature/dashboard-ui` | "Improved dashboard cards and layout" |
| Prakash | `feature/invoice-api` | "Added invoice routes and validation" |
| Aanchal | `feature/email-templates` | "Added email templates for onboarding" |
| Intern | `feature/fix-typo-landing` | "Fixed minor typo on landing page" |

---

## 🧠 Common Git Commands

| Action | Command |
|--------|---------|
| Clone repository | `git clone <repo-url>` |
| Switch to dev | `git checkout dev` |
| Create new branch | `git checkout -b feature/...` |
| Add changes | `git add .` |
| Commit changes | `git commit -m "message"` |
| Push to GitHub | `git push origin feature/...` |
| Pull latest changes | `git pull origin dev` |

---

## 🧾 Team Rules

### ✅ Do
- Always use company repositories
- Create feature branches for new work
- Commit often with clear messages
- Pull latest changes before coding
- Review PRs thoroughly
- Keep commits clean and organized

### ❌ Don't
- Don't push to personal GitHub accounts
- Don't code directly on `main` branch
- Don't wait until end of week to commit
- Don't overwrite others' changes
- Don't merge without testing
- Don't commit debug logs or `.env` files

---

## 🗂️ Documentation Standards

Every project **must** include:

- **README.md** → Project overview, setup instructions, and usage guide
- **.env.example** → Template of required environment variables
- **docs/** → Folder for architecture notes and deployment steps

💡 **Important:** Update documentation whenever you add new features

---

## 🧱 Responsibilities

| Team Member | Main Focus Area |
|------------|-----------------|
| Devdeep | Backend & Authentication |
| Firoz | UI / Frontend Development |
| Prakash | API & Third-party Integrations |
| Aanchal | UI Components & Email Templates |
| Interns | Assist under senior guidance |

📋 **Note:** Everyone should understand the basic structure of the entire codebase to provide backup support when needed.

---

## 🚀 Quick Recap

1. Clone from company GitHub organization
2. Work in feature branches (`feature/your-name`)
3. Create Pull Requests for review
4. Review each other's code
5. Merge to `dev` and test thoroughly
6. Merge to `main` for automatic Vercel deployment

### 🏁 "One repo, one flow, one team."

---

## 💡 Tips for New Members

1. **Request access** to the company GitHub organization
2. **Clone only** from official company repositories
3. **Always create** your own feature branch
4. **Ask for help** before merging any code
5. **Use PR comments** as learning opportunities

---

## 💬 Final Message

> **"We code individually but build collectively."**  
> — Team yourcompany-org

### This process helps us:
- Keep code organized and maintainable
- Avoid merge conflicts
- Review and learn from each other's work
- Deploy confidently without breaking production

**Let's make this our standard workflow going forward!** 🚀

---

*Last Updated: November 2025*