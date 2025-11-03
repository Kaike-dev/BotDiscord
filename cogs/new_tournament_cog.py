# cogs/cmd_new_tournament.py
import discord
from discord import app_commands
from discord.ext import commands
from utils.data_manager import load_data, save_data

@app_commands.command(name="new_tournament", description="Cria um novo torneio e o torna ativo")
@app_commands.choices(tipo=[
    app_commands.Choice(name="Pontos Corridos", value="pontos_corridos"),
    app_commands.Choice(name="Fase de Grupos", value="fase_de_grupos"),
    app_commands.Choice(name="Suíço", value="suico"),
    app_commands.Choice(name="Mata-mata", value="mata_mata"),
])
async def new_tournament(interaction: discord.Interaction, name: str, tipo: app_commands.Choice[str]):
    data = load_data()
    if name in data["tournaments"]:
        await interaction.response.send_message(" Já existe um torneio com esse nome.", ephemeral=True)
        return

    data["tournaments"][name] = {
        "type": tipo.value,
        "players": {},
        "matches": []
    }
    data["active"] = name
    save_data(data)
    await interaction.response.send_message(f" Torneio **{name}** criado e definido como ativo (tipo: {tipo.name}).")

async def setup(bot: commands.Bot):
    bot.tree.add_command(new_tournament)