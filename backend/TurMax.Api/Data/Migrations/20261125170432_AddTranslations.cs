using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurMax.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTranslations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Translations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntityType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Field = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Lang = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", maxLength: 400, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Translations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Translations_EntityType_Lang_EntityId_Field",
                table: "Translations",
                columns: new[] { "EntityType", "Lang", "EntityId", "Field" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Translations");
        }
    }
}
