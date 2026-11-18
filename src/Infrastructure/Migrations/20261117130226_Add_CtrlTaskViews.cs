using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InstaDataApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_CtrlTaskViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_CalculationDays",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_CalculationDays", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_CalculationTypes",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SignType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_CalculationTypes", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_CalculationTypes",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SignType = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_CalculationTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_Claims",
                columns: table => new
                {
                    claim_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    claim_date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    claimant_name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    claim_description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    claim_amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    claimants_count = table.Column<int>(type: "int", nullable: false),
                    claim_department = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_Claims", x => x.claim_id);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_DataSources",
                columns: table => new
                {
                    SourceID = table.Column<int>(type: "int", nullable: false),
                    SourceName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SchemaName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ObjectName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    OutputType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DateFieldID = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_DataSources", x => x.SourceID);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_DataSources",
                schema: "dbo",
                columns: table => new
                {
                    SourceID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SourceName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    SourceType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SchemaName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ObjectName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    OutputType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DateFieldID = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_DataSources", x => x.SourceID);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_Fines",
                columns: table => new
                {
                    fine_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    payer_name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    fine_date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    fine_reason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    fine_amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    is_paid = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_Fines", x => x.fine_id);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_Icon",
                columns: table => new
                {
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_Icon", x => x.Name);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_ICON",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IconClass = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_ICON", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_MetricDetailFields",
                columns: table => new
                {
                    MetricID = table.Column<int>(type: "int", nullable: false),
                    FieldID = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_MetricDetailFields", x => new { x.MetricID, x.FieldID });
                });

            migrationBuilder.CreateTable(
                name: "CTRL_Payments",
                columns: table => new
                {
                    payment_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    payment_date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    payer_name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    payments_count = table.Column<int>(type: "int", nullable: false),
                    full_payment = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    payment_department = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_Payments", x => x.payment_id);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_UserDisplaySettings",
                columns: table => new
                {
                    UserID = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CardsPerRow = table.Column<int>(type: "int", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_UserDisplaySettings", x => x.UserID);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_UserMetricSettings",
                columns: table => new
                {
                    UserID = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    MetricID = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: true),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_UserMetricSettings", x => new { x.UserID, x.MetricID });
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_Metrics",
                columns: table => new
                {
                    MetricID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MetricName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SourceID = table.Column<int>(type: "int", nullable: false),
                    CalculationTypeID = table.Column<int>(type: "int", nullable: false),
                    SumFieldID = table.Column<int>(type: "int", nullable: true),
                    GroupFieldID = table.Column<int>(type: "int", nullable: true),
                    DateRangeType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IconCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_Metrics", x => x.MetricID);
                    table.ForeignKey(
                        name: "FK_CTRL_Metrics_CTRL_CalculationTypes_CalculationTypeID",
                        column: x => x.CalculationTypeID,
                        principalTable: "CTRL_CalculationTypes",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_DataSourceFields",
                columns: table => new
                {
                    FieldID = table.Column<int>(type: "int", nullable: false),
                    SourceID = table.Column<int>(type: "int", nullable: false),
                    FieldName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    DataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsSummable = table.Column<bool>(type: "bit", nullable: false),
                    IsGroupable = table.Column<bool>(type: "bit", nullable: false),
                    IsFilterable = table.Column<bool>(type: "bit", nullable: false),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_DataSourceFields", x => x.FieldID);
                    table.ForeignKey(
                        name: "FK_CTRL_DataSourceFields_CTRL_DataSources_SourceID",
                        column: x => x.SourceID,
                        principalTable: "CTRL_DataSources",
                        principalColumn: "SourceID");
                });

            migrationBuilder.CreateTable(
                name: "CTRL_DataSourceParameters",
                columns: table => new
                {
                    ParameterID = table.Column<int>(type: "int", nullable: false),
                    SourceID = table.Column<int>(type: "int", nullable: false),
                    ParameterName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ParameterType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ParameterValue = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_DataSourceParameters", x => x.ParameterID);
                    table.ForeignKey(
                        name: "FK_CTRL_DataSourceParameters_CTRL_DataSources_SourceID",
                        column: x => x.SourceID,
                        principalTable: "CTRL_DataSources",
                        principalColumn: "SourceID");
                });

            migrationBuilder.CreateTable(
                name: "CTRL_DataSourceFields",
                schema: "dbo",
                columns: table => new
                {
                    FieldID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SourceID = table.Column<int>(type: "int", nullable: false),
                    FieldName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    DataType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsSummable = table.Column<bool>(type: "bit", nullable: false),
                    IsGroupable = table.Column<bool>(type: "bit", nullable: false),
                    IsFilterable = table.Column<bool>(type: "bit", nullable: false),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_DataSourceFields", x => x.FieldID);
                    table.ForeignKey(
                        name: "FK_CTRL_DataSourceFields_CTRL_DataSources_SourceID",
                        column: x => x.SourceID,
                        principalSchema: "dbo",
                        principalTable: "CTRL_DataSources",
                        principalColumn: "SourceID");
                });

            migrationBuilder.CreateTable(
                name: "CTRL_Metrics",
                schema: "dbo",
                columns: table => new
                {
                    MetricID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MetricName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SourceID = table.Column<int>(type: "int", nullable: false),
                    CalculationTypeID = table.Column<int>(type: "int", nullable: false),
                    SumFieldID = table.Column<int>(type: "int", nullable: true),
                    GroupFieldID = table.Column<int>(type: "int", nullable: true),
                    DateRangeType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IconCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_Metrics", x => x.MetricID);
                    table.ForeignKey(
                        name: "FK_CTRL_Metrics_CTRL_CalculationTypes_CalculationTypeID",
                        column: x => x.CalculationTypeID,
                        principalSchema: "dbo",
                        principalTable: "CTRL_CalculationTypes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CTRL_Metrics_CTRL_DataSources_SourceID",
                        column: x => x.SourceID,
                        principalSchema: "dbo",
                        principalTable: "CTRL_DataSources",
                        principalColumn: "SourceID");
                });

            migrationBuilder.CreateTable(
                name: "CTRL_Tasks",
                columns: table => new
                {
                    TaskID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TaskTitle = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    TaskDescription = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    TeamID = table.Column<int>(type: "int", nullable: false),
                    AssignedUserID = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Priority = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SourceType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SourceSystemCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SourceEntityType = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    SourceEntityID = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    SourceURL = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    MetricID = table.Column<int>(type: "int", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(130)", maxLength: 130, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(130)", maxLength: 130, nullable: true),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_Tasks", x => x.TaskID);
                    table.ForeignKey(
                        name: "FK_CTRL_Tasks_CTRL_Metrics_MetricID",
                        column: x => x.MetricID,
                        principalTable: "CTRL_Metrics",
                        principalColumn: "MetricID");
                });

            migrationBuilder.CreateTable(
                name: "CTRL_MetricDetailFields",
                schema: "dbo",
                columns: table => new
                {
                    MetricID = table.Column<int>(type: "int", nullable: false),
                    FieldID = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_MetricDetailFields", x => new { x.MetricID, x.FieldID });
                    table.ForeignKey(
                        name: "FK_CTRL_MetricDetailFields_CTRL_Metrics_MetricID",
                        column: x => x.MetricID,
                        principalSchema: "dbo",
                        principalTable: "CTRL_Metrics",
                        principalColumn: "MetricID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_TaskComments",
                columns: table => new
                {
                    CommentID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TaskID = table.Column<long>(type: "bigint", nullable: false),
                    CommentText = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_TaskComments", x => x.CommentID);
                    table.ForeignKey(
                        name: "FK_CTRL_TaskComments_CTRL_Tasks_TaskID",
                        column: x => x.TaskID,
                        principalTable: "CTRL_Tasks",
                        principalColumn: "TaskID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_TaskHistory",
                columns: table => new
                {
                    HistoryID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TaskID = table.Column<long>(type: "bigint", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    FieldName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OldValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChangedBy = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ChangedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_TaskHistory", x => x.HistoryID);
                    table.ForeignKey(
                        name: "FK_CTRL_TaskHistory_CTRL_Tasks_TaskID",
                        column: x => x.TaskID,
                        principalTable: "CTRL_Tasks",
                        principalColumn: "TaskID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CTRL_TaskViews",
                columns: table => new
                {
                    TaskID = table.Column<long>(type: "bigint", nullable: false),
                    UserID = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    LastViewedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CTRL_TaskViews", x => new { x.TaskID, x.UserID });
                    table.ForeignKey(
                        name: "FK_CTRL_TaskViews_CTRL_Tasks_TaskID",
                        column: x => x.TaskID,
                        principalTable: "CTRL_Tasks",
                        principalColumn: "TaskID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_CalculationDays_Value",
                schema: "dbo",
                table: "CTRL_CalculationDays",
                column: "Value",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_CalculationTypes_Value",
                table: "CTRL_CalculationTypes",
                column: "Value",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_CalculationTypes_Name",
                schema: "dbo",
                table: "CTRL_CalculationTypes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_DataSourceFields_SourceID",
                table: "CTRL_DataSourceFields",
                column: "SourceID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_DataSourceFields_SourceID_FieldName",
                schema: "dbo",
                table: "CTRL_DataSourceFields",
                columns: new[] { "SourceID", "FieldName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_DataSourceParameters_SourceID",
                table: "CTRL_DataSourceParameters",
                column: "SourceID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_DataSources_SourceName",
                schema: "dbo",
                table: "CTRL_DataSources",
                column: "SourceName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_ICON_Name",
                schema: "dbo",
                table: "CTRL_ICON",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Metrics_CalculationTypeID",
                table: "CTRL_Metrics",
                column: "CalculationTypeID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Metrics_CalculationTypeID",
                schema: "dbo",
                table: "CTRL_Metrics",
                column: "CalculationTypeID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Metrics_MetricName",
                schema: "dbo",
                table: "CTRL_Metrics",
                column: "MetricName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Metrics_SourceID",
                schema: "dbo",
                table: "CTRL_Metrics",
                column: "SourceID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_TaskComments_TaskID",
                table: "CTRL_TaskComments",
                column: "TaskID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_TaskHistory_TaskID",
                table: "CTRL_TaskHistory",
                column: "TaskID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Tasks_AssignedUserID",
                table: "CTRL_Tasks",
                column: "AssignedUserID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Tasks_DueDate",
                table: "CTRL_Tasks",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Tasks_MetricID",
                table: "CTRL_Tasks",
                column: "MetricID");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_Tasks_Status",
                table: "CTRL_Tasks",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CTRL_TaskViews_UserID_LastViewedDate",
                table: "CTRL_TaskViews",
                columns: new[] { "UserID", "LastViewedDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "CTRL_CalculationDays",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "CTRL_Claims");

            migrationBuilder.DropTable(
                name: "CTRL_DataSourceFields");

            migrationBuilder.DropTable(
                name: "CTRL_DataSourceFields",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "CTRL_DataSourceParameters");

            migrationBuilder.DropTable(
                name: "CTRL_Fines");

            migrationBuilder.DropTable(
                name: "CTRL_Icon");

            migrationBuilder.DropTable(
                name: "CTRL_ICON",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "CTRL_MetricDetailFields");

            migrationBuilder.DropTable(
                name: "CTRL_MetricDetailFields",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "CTRL_Payments");

            migrationBuilder.DropTable(
                name: "CTRL_TaskComments");

            migrationBuilder.DropTable(
                name: "CTRL_TaskHistory");

            migrationBuilder.DropTable(
                name: "CTRL_TaskViews");

            migrationBuilder.DropTable(
                name: "CTRL_UserDisplaySettings");

            migrationBuilder.DropTable(
                name: "CTRL_UserMetricSettings");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "CTRL_DataSources");

            migrationBuilder.DropTable(
                name: "CTRL_Metrics",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "CTRL_Tasks");

            migrationBuilder.DropTable(
                name: "CTRL_CalculationTypes",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "CTRL_DataSources",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "CTRL_Metrics");

            migrationBuilder.DropTable(
                name: "CTRL_CalculationTypes");
        }
    }
}
