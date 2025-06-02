# 🧙‍♂️ AsistenteMagic

**AsistenteMagic** is a web application built with Angular designed to act as a digital assistant for physical *Magic: The Gathering* games. It allows you to load decks, visualize game zones, manage card actions and rules, and track the full history of a match.

> This project was developed as part of the final coursework for the Advanced Vocational Training Program in Multiplatform Application Development (DAM).

---

## 🚀 Key Features

- 📦 **Deck import** from plain text, with support for separating maindeck and sideboard.
- 🔮 **Enhanced card display**, including Oracle text, mana symbols, and card images via the Scryfall API.
- ⚔️ **Battlefield management**, organizing permanents into logical rows by type (creatures, artifacts, lands...).
- 📚 **Interactive zones**: library, hand, graveyard, exile, battlefield, stack, and command zone.
- 🌀 **Trigger detection** for enter/leave/dies and activated abilities.
- 💾 **Game state persistence**, including deck, zones, stack, and action log, with full session resume.
- 🛠️ Developed with **Angular 19+**.

---

## 📦 Installation

Clone the repository and install dependencies:

```bash
  git clone https://github.com/JoseAntonioReyesSolera/FinalProject.git
cd FinalProject

npm install
```

## 🧪 Development Server
To start the development server:

```bash
ng serve
```
Navigate to http://localhost:4200 in your browser.
The application will automatically reload on code changes.

## 🧰 Technologies Used
* Angular 19+

* TypeScript

* HTML & CSS (Bootstrap for styling)

* Scryfall API – Card data and images

* LocalStorage – Match persistence

## 🎯 Project Goal
The main goal of AsistenteMagic is to support Magic: The Gathering players during physical games by providing a digital assistant that helps manage game mechanics, track actions, and reduce player error. It is intended as a tool for both casual and competitive play.

## 💡 Future Improvements
* 📲 Progressive Web App (PWA) support for mobile usage

* 🔗 Multiplayer or shared match state sync

* 🧠 Advanced rules engine for automatic interactions

* 🌐 Multi-language support

## 🤝 Contributing
Contributions are welcome! If you’d like to report a bug, suggest a feature, or submit a pull request, feel free to do so. Let’s build a better assistant together.
