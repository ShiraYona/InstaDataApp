# InstaDataApp

שלד נקי (skeleton) בארכיטקטורת Clean Architecture על .NET 8, עם לקוח Angular 18 ו-PrimeNG בעברית ובכיווניות RTL.

## מבנה הפרויקט

```
src/
├── Domain/            ישויות, אירועי דומיין, אובייקטי ערך, קבועים
├── Application/       CQRS (MediatR), ולידציה, מיפויים, ממשקים
├── Infrastructure/    EF Core, Identity, אינטרספטורים
└── Web/               ASP.NET Core Web API + Angular ClientApp
```

## דרישות מוקדמות

- .NET 8 SDK
- Node.js (LTS) ו-npm
- SQL Server (או LocalDB) עבור Identity ו-EF Core

## הרצה

```bash
dotnet build
dotnet run --project src/Web
```

השרת יעלה על `https://localhost:5001`, וה-SPA על `https://localhost:44447` (דרך SpaProxy).

## נקודות הרחבה

- **ישויות** — `src/Domain/Entities`
- **פקודות ושאילתות** — `src/Application/Modules/<שם המודול>`
- **ממשקי DbContext** — `src/Application/Common/Interfaces/IApplicationDbContext.cs`
- **נקודות קצה** — `src/Web/Endpoints` (ירושה מ-`EndpointGroupBase`)
- **מיגרציות** — `dotnet ef migrations add <שם> --project src/Infrastructure --startup-project src/Web`

## הגדרות

מחרוזות החיבור וההגדרות ב-`appsettings.json` הן דוגמה בלבד — יש להחליף בערכים אמיתיים בסביבת ההרצה (או ב-User Secrets / Azure Key Vault).
