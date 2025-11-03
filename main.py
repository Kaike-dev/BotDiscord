# main.py
import discord
import os
from dotenv import load_dotenv
from discord.ext import commands

# Carrega as variáveis de ambiente do .env
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = os.getenv("GUILD_ID") # Opcional
COGS_DIR = "cogs"

# Usamos commands.Bot
class MeuPrimeiroBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(command_prefix="!", intents=intents)

    async def on_ready(self):
        print(f" Bot online: {self.user} (ready)")

    # O setup_hook carrega Cogs E sincroniza a árvore
    async def setup_hook(self):
        print("Carregando cogs...")
        
        # Este loop carrega TODOS os .py na pasta 'cogs'
        for filename in os.listdir(COGS_DIR):
            if filename.endswith(".py") and not filename.startswith("__"):
                try:
                    # O nome da extensão é 'pasta.arquivo' (sem o .py)
                    await self.load_extension(f"{COGS_DIR}.{filename[:-3]}")
                    print(f"  [+] Cog '{filename}' carregado.")
                except Exception as e:
                    print(f"  [!] Falha ao carregar cog '{filename}': {e}")
        
        print("\nSincronizando comandos...")
        # Sincroniza os comandos (exatamente como no seu original)
        if GUILD_ID:
            guild = discord.Object(id=GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            print(f"Sincronizado com a guild: {GUILD_ID}")
        else:
            await self.tree.sync()
            print("Sincronizado globalmente.")


# Bloco principal para rodar o bot
if __name__ == "__main__":
    bot = MeuPrimeiroBot()
    bot.run(TOKEN)