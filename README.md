# Spokojny budżet

Prosta aplikacja do pilnowania budżetu i hamowania impulsywnych zakupów. Czysty HTML, CSS i JavaScript, bez bibliotek i bez serwera. Dane zapisują się tylko w Twojej przeglądarce (localStorage).

## Co potrafi

- **Pulpit:** wpisujesz wypłatę, a aplikacja dzieli ją procentowo na stałe opłaty, cele specjalne, codzienne życie i kieszonkowe na dopaminę. Reszta to oszczędności.
- **Tygodnie:** pula na codzienne życie i przyjemności jest dzielona na 4 tygodnie. Pasek zmienia kolor, gdy zostaje mniej niż 25%, i robi się czerwony po przekroczeniu limitu.
- **Chcę to kupić:** zachcianka dostaje blokadę 48 godzin lub 7 dni. Przycisk „Kupuję" odblokuje się dopiero po czasie. „Rezygnuję" dolicza kwotę do licznika „Uratowane przed impulsem".
- Tryb jasny i ciemny (domyślnie według ustawień systemu).
- **Szybki wydatek:** przycisk „+" w rogu ekranu. Wpisujesz kwotę i jednym tapnięciem wybierasz kategorię.
- **Mam ochotę kupić TERAZ:** przycisk pod zakładkami, od razu otwiera formularz zachcianki.
- **Pytania przy zachciance:** powód (nuda, stres, nagroda, potrzeba) i siła chęci 1–5. Po upływie blokady oceniasz chęć jeszcze raz.
- **Przeliczenie ceny:** na godziny pracy (przy założeniu 160 h w miesiącu) i na procent puli tygodnia.
- **Wieczorny baner:** po 18:00, jeśli nic jeszcze nie wpisano, pyta o dzisiejsze zakupy. „Nic dziś nie kupiono" też liczy się do serii.
- **Seria dni bez impulsu** i krótkie podsumowanie (przyjemności, uratowane kwoty, najdroższy tydzień).
- **Ustawienia komfortu:** spokojne kolory bez czerwieni, większa czcionka, brak animacji.
- **Kopia danych:** eksport i import pliku JSON oraz przycisk „Zacznij nowy miesiąc".

Prawdziwe powiadomienia push nie są jeszcze zaimplementowane, bo wymagają PWA z service workerem.

## Struktura plików

```
index.html   struktura strony
style.css    wygląd, motywy jasny i ciemny
app.js       logika i zapis danych
README.md    ta instrukcja
```

## Uruchomienie lokalnie

1. Pobierz lub skopiuj folder z czterema plikami.
2. Otwórz `index.html` dwukrotnym kliknięciem. Aplikacja działa w przeglądarce, nie wymaga instalacji.

Opcjonalnie możesz uruchomić mały serwer (potrzebny Python):

```
python -m http.server 8000
```

Potem wejdź na `http://localhost:8000`.

## Wdrożenie na GitHub Pages

1. Zaloguj się na [github.com](https://github.com) i kliknij **New repository**.
2. Nadaj nazwę (np. `spokojny-budzet`), zostaw **Public**, kliknij **Create repository**.
3. Na stronie repozytorium wybierz **uploading an existing file**, przeciągnij cztery pliki i kliknij **Commit changes**.
   Albo przez terminal, w folderze z plikami:
   ```
   git init
   git add .
   git commit -m "Pierwsza wersja"
   git branch -M main
   git remote add origin https://github.com/TWOJ-LOGIN/spokojny-budzet.git
   git push -u origin main
   ```
4. Wejdź w **Settings → Pages**.
5. W sekcji **Build and deployment** wybierz **Deploy from a branch**, gałąź **main** i folder **/ (root)**, potem **Save**.
6. Po 1–2 minutach aplikacja będzie pod adresem `https://TWOJ-LOGIN.github.io/spokojny-budzet/`.

## Dobrze wiedzieć

- Dane są lokalne: każda przeglądarka i każde urządzenie ma osobny zapis. Wyczyszczenie danych przeglądarki usuwa dane aplikacji.
- Na telefonie możesz dodać stronę do ekranu głównego (Udostępnij → Dodaj do ekranu początkowego).
- Domyślne proporcje (50/10/25/5 i 10% oszczędności) zmienisz na Pulpicie albo w obiekcie `defaults` na początku `app.js`.
