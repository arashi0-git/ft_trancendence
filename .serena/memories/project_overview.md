# ft_trancendence Project Overview

## Project Purpose
This is a 42 School project called "ft_transcendence" which involves creating a comprehensive Pong gaming website. The project is designed to challenge students with unknown technologies and develop adaptation skills.

## Main Requirements
- **Core Game**: A real-time multiplayer Pong game website
- **User Interface**: Single-page application with proper browser navigation
- **Architecture**: Can be built with or without a backend
- **Deployment**: Must use Docker for deployment with a single command
- **Security**: HTTPS required, password hashing, protection against SQL injection/XSS
- **Browser Compatibility**: Must work with latest Mozilla Firefox

## Project Structure
This is a modular project where:
- **Mandatory Part** (25% of grade): Basic functional Pong website
- **Module Selection** (75% of grade): Choose 7+ major modules from various categories:
  - Web (frameworks, databases, blockchain)
  - User Management (authentication, remote auth)
  - Gameplay (remote players, multiplayer, AI, chat)
  - Cybersecurity (WAF, 2FA, GDPR)
  - DevOps (monitoring, microservices, logging)
  - Graphics (3D with Babylon.js)
  - Accessibility (multi-device, multi-language, SSR)
  - Server-Side Pong (API implementation)

## Technology Constraints
- **Frontend**: TypeScript (required by default, can be modified by Frontend module)
- **Backend**: Pure PHP without frameworks (can be overridden by Framework module)
- **Database**: SQLite (when using Database module)
- **Specific Modules**: Various technologies specified per module (e.g., Fastify+Node.js, Avalanche blockchain, etc.)

## Current Implementation Status
- **Tech Stack**: TypeScript + Node.js
- **Tooling**: ESLint, Jest, tsx for development
- **CI/CD**: GitHub Actions workflow for quality checks
- **Code Status**: Minimal boilerplate with a simple hello function