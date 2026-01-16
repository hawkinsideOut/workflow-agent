# Governance

This document describes the governance model for the Workflow Agent project.

## 🎯 Project Mission

Workflow Agent exists to provide a self-evolving, AI-friendly workflow management system that helps development teams maintain consistency and quality across any tech stack.

## 👥 Roles

### Users

Anyone using Workflow Agent in their projects.

- Can submit bug reports and feature requests
- Can participate in discussions
- Can vote on improvement suggestions

### Contributors

Anyone who has contributed code, documentation, or other work to the project.

- All rights of Users
- Can submit pull requests
- Can review others' pull requests
- Can earn trust score through quality contributions

### Maintainers

Core team members with commit access to the repository.

**Current Maintainers:**

- @hawkinsideOut (Project Creator)

**Responsibilities:**

- Review and merge pull requests
- Triage issues and feature requests
- Maintain project roadmap
- Release new versions
- Moderate community discussions
- Make final decisions on contentious issues

**Nomination Process:**

1. Must be an active contributor for 6+ months
2. Must have 10+ merged pull requests
3. Must demonstrate understanding of project goals
4. Must be nominated by existing maintainer
5. Must receive unanimous approval from current maintainers

### Lead Maintainer

The lead maintainer has final say on project direction and breaking changes.

**Current Lead:** @hawkinsideOut

## 📊 Decision Making

### Routine Decisions

Day-to-day decisions (bug fixes, minor features, documentation) are made by **consensus** among maintainers.

- Any maintainer can approve and merge a PR
- At least 1 approval required for small changes
- At least 2 approvals required for significant changes

### Significant Decisions

Significant changes (breaking changes, major features, architecture changes) require **majority approval**.

- Proposal opened as GitHub Discussion or RFC
- Community feedback period (1-2 weeks)
- Maintainers vote
- Simple majority (>50%) required
- Lead maintainer breaks ties

### Breaking Changes

Changes that break backward compatibility require:

1. **RFC (Request for Comments)** - Detailed proposal
2. **Community feedback** - At least 2 weeks
3. **Migration guide** - Clear upgrade path
4. **Deprecation warnings** - At least 2 minor versions
5. **Maintainer approval** - 2/3 majority

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)** - Breaking changes
- **Minor (0.X.0)** - New features, backward compatible
- **Patch (0.0.X)** - Bug fixes, backward compatible

### Release Schedule

- **Monthly minors** - First Tuesday of each month
- **Quarterly majors** - January, April, July, October
- **Patch releases** - As needed for critical bugs

### Release Checklist

- [ ] All tests passing
- [ ] Changelog updated
- [ ] Version bumped (changesets)
- [ ] Documentation updated
- [ ] Migration guide (if breaking)
- [ ] Announcement drafted
- [ ] npm packages published
- [ ] GitHub release created
- [ ] Community notified (Discord/Twitter)

## 🔄 Improvement Suggestion Process

Community-submitted improvement suggestions follow this flow:

1. **Submission** - Via `workflow suggest` or GitHub Discussion
2. **Moderation** - Spam filter, content review, trust score check
3. **Community voting** - Upvote/downvote by users
4. **AI prioritization** - Impact score calculation
5. **Maintainer review** - Weekly triage meeting
6. **Implementation** - Accepted suggestions become issues
7. **Release** - Included in next appropriate release

### Trust Score System

Contributors earn trust score through:

- **Merged PRs** - +10 points each
- **Helpful reviews** - +5 points each
- **Quality bug reports** - +3 points each
- **Spam/abuse** - -50 points

Trust score determines:

- **80+** - Suggestions auto-approved
- **50-79** - Suggestions reviewed within 24h
- **20-49** - Suggestions reviewed within 1 week
- **<20** - Suggestions require manual review

## 🌍 Long-Term Support (LTS)

### Support Policy

- **Current major version** - Full support (features + bug fixes)
- **Previous major version** - Maintenance (critical bugs + security)
- **Older versions** - No support (community can maintain forks)

### Example Timeline

If v2.0.0 is released in January 2026:

- **v2.x.x** - Full support until v3.0.0 release
- **v1.x.x** - Maintenance until January 2027 (12 months)
- **v0.x.x** - No official support

## 🔐 Security

### Reporting Security Issues

**Do NOT open public issues for security vulnerabilities.**

Email: security@workflow.dev

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Response

1. **Acknowledgment** - Within 24 hours
2. **Assessment** - Within 48 hours
3. **Fix developed** - Within 1 week for critical issues
4. **Patch released** - As soon as fix is ready
5. **Public disclosure** - After patch is available
6. **CVE assigned** - For significant vulnerabilities

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:

- Age, body size, disability
- Ethnicity, gender identity and expression
- Level of experience, education, socioeconomic status
- Nationality, personal appearance, race, religion
- Sexual identity and orientation

### Our Standards

**Positive behavior:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other members

**Unacceptable behavior:**

- Trolling, insulting/derogatory comments, personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Violations can be reported to: conduct@workflow.dev

Maintainers will:

1. Review the report
2. Investigate the situation
3. Take appropriate action (warning, temp ban, permanent ban)
4. Notify the reporter of the outcome

## 🔄 Governance Changes

This governance document can be changed by:

1. **Proposal** - Open as GitHub Discussion
2. **Feedback period** - Minimum 2 weeks
3. **Maintainer vote** - 2/3 majority required
4. **Lead approval** - Final sign-off

## 📧 Contact

- **General questions**: GitHub Discussions
- **Security issues**: security@workflow.dev
- **Code of conduct**: conduct@workflow.dev
- **Press/media**: press@workflow.dev

---

_Last updated: January 14, 2026_
