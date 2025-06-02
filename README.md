# Landscape Estimator 🌍🤖

**AI-powered land area estimates.**

## 🚀 What is this?

Landscape Estimator is a tool that uses **AI, GIS data, and aerial imagery** to estimate land areas for landscaping and property management. It combines:  
✅ **Public GIS data** for property sizes  
✅ **Aerial analysis** for estimating lawn areas  
✅ **User-assisted polygon tracing** for corrections  
✅ **Next.js + TypeScript** for modern web performance

## 🔧 How It Works

1. **Enter an Address** → We pull public land area data.
2. **AI Analyzes Aerial Data** → If data is missing, we estimate from images.
3. **User Refines the Estimate** → Adjust land area with a simple UI.

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript
- **Backend:** GIS APIs, AI/ML models (TBD)
- **Mapping:** Google Maps API / Leaflet.js
- **Analytics:** Type-safe event tracking with custom TypeScript types
- **Analytics:** Mixpanel, Firestore

## 🔽 Installation

```sh
git clone https://github.com/citizenbob/land-estimator.git
cd landscape-estimator
yarn install
yarn dev
```

## 📊 Analytics

We've implemented a comprehensive analytics system to track user behavior, system performance, and errors:

- **Mixpanel:** Tracks user interactions and product analytics
- **Firestore:** Stores detailed event data for business intelligence
- **Privacy-focused:** No PII is tracked without explicit consent

For details on the analytics implementation:

- [Services Documentation](./src/services/README.md)
- [Hooks Documentation](./src/hooks/README.md)

## 🤝 Contributing

We’re building this **in public**—contributions, feedback, and issues are welcome!  
1️⃣ [Contributor's Guide](./CONTRIBUTING.md)  
2️⃣ [Open an Issue](https://github.com/citizenbob/land-estimator/issues/new)
3️⃣ [Submit a PR](https://github.com/citizenbob/land-estimator/pulls)
4️⃣ [Join discussions](https://github.com/citizenbob/land-estimator/discussions)

## 📜 License & Contributions

This project is publicly viewable for transparency and discussion but is **not open-source**.

- **You MAY:** View the code, provide feedback, and contribute ideas.
- **You MAY NOT:** Copy, modify, or redistribute this code without explicit permission.
- **All contributions are owned by Good Citizens Corporation.**

This project is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

For details, see the [LICENSE](./LICENSE) file.
