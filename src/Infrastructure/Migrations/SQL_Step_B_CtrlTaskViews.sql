-- שלב ב' — טבלת CTRL_TaskViews בלבד (בלי להריץ את כל סכימת ה-baseline).
-- להריץ רק אחרי שהנתונים הקיימים גובו.

IF OBJECT_ID('dbo.CTRL_TaskViews') IS NULL
BEGIN
    CREATE TABLE [dbo].[CTRL_TaskViews] (
        [TaskID] bigint NOT NULL,
        [UserID] nvarchar(128) NOT NULL,
        [LastViewedDate] datetime2 NOT NULL,
        CONSTRAINT [PK_CTRL_TaskViews] PRIMARY KEY ([TaskID], [UserID]),
        CONSTRAINT [FK_CTRL_TaskViews_CTRL_Tasks_TaskID]
            FOREIGN KEY ([TaskID]) REFERENCES [dbo].[CTRL_Tasks] ([TaskID]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_CTRL_TaskViews_UserID_LastViewedDate]
        ON [dbo].[CTRL_TaskViews] ([UserID], [LastViewedDate]);
END
GO

-- רישום המיגרציה כמוחלת — כדי ש-dotnet ef לא יבקש להריץ אותה שוב.
IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory]
               WHERE [MigrationId] = N'20261117130226_Add_CtrlTaskViews')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261117130226_Add_CtrlTaskViews', N'8.0.18');
END
GO
