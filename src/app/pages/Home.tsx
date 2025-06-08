'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search, Trophy, Users, Target, Skull, Eye, RefreshCw } from 'lucide-react';

// Interfaces TypeScript
interface Player {
  name: string;
  score: number;
}

interface GameData {
  id: string;
  totalKills: number;
  players: Record<string, string>;
  playerScores: Record<string, number>;
  killsByMeans: Record<string, number>;
  worldKills: number;
  ranking: Player[];
}

interface GameSummary {
  id: string;
  totalKills: number;
  players: Record<string, string>;
  playerScores: Record<string, number>;
  killsByMeans: Record<string, number>;
  worldKills: number;
  ranking: Player[];
}

interface SortConfig {
  key: keyof GameData | 'playersCount' | null;
  direction: 'asc' | 'desc';
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  iconColor: string;
}

interface ApiConfig {
  allGamesEndpoint: string;
  getGameEndpoint: (id: string) => string;
  getGameRankingEndpoint: (id: string) => string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Configuração dos endpoints da API
const API_CONFIG: ApiConfig = {
  allGamesEndpoint: `${BASE_URL}/api/games`,
  getGameEndpoint: (id: string) => `${BASE_URL}/api/games/${id}`,
  getGameRankingEndpoint: (id: string) => `${BASE_URL}/api/games/${id}/ranking`
};

// Componente StatsCard
const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, gradient, iconColor }) => (
  <div className={`bg-gradient-to-r ${gradient} rounded-xl p-6 text-white`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`${iconColor} text-sm`}>{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={iconColor}>
        {icon}
      </div>
    </div>
  </div>
);

// Componente SortIcon
interface SortIconProps {
  column: keyof GameData | 'playersCount';
  sortConfig: SortConfig;
}

const SortIcon: React.FC<SortIconProps> = ({ column, sortConfig }) => {
  if (sortConfig.key !== column) {
    return <ChevronUp className="w-4 h-4 text-gray-400" />;
  }
  return sortConfig.direction === 'asc' 
    ? <ChevronUp className="w-4 h-4 text-blue-600" />
    : <ChevronDown className="w-4 h-4 text-blue-600" />;
};

// Componente principal
const GamesTable: React.FC = () => {
  const [games, setGames] = useState<GameData[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingGameDetails, setLoadingGameDetails] = useState<Set<string>>(new Set());
  const [gameDetailsCache, setGameDetailsCache] = useState<Map<string, GameData>>(new Map());

  useEffect(() => {
    fetchAllGames();
  }, []);

  // Função para buscar todos os jogos
  const fetchAllGames = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(API_CONFIG.allGamesEndpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: GameData[] = await response.json();
      setGames(data);
      // Limpar cache quando buscar novos dados
      setGameDetailsCache(new Map());
    } catch (error) {
      console.error('Erro ao buscar todos os jogos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para buscar detalhes de um jogo específico
  const fetchGameDetails = async (gameId: string): Promise<GameData | null> => {
    // Verificar se já temos os dados em cache
    if (gameDetailsCache.has(gameId)) {
      return gameDetailsCache.get(gameId)!;
    }

    setLoadingGameDetails(prev => new Set(prev).add(gameId));
    try {
      const response = await fetch(API_CONFIG.getGameEndpoint(gameId));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const gameData: GameData = await response.json();
      
      // Atualizar cache
      setGameDetailsCache(prev => new Map(prev).set(gameId, gameData));
      
      // Atualizar o jogo na lista principal se necessário
      setGames(prev => prev.map(game => 
        game.id === gameId ? { ...game, ...gameData } : game
      ));
      
      return gameData;
    } catch (error) {
      console.error(`Erro ao buscar detalhes do jogo ${gameId}:`, error);
      return null;
    } finally {
      setLoadingGameDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
    }
  };

  // Função para buscar ranking de um jogo específico
  const fetchGameRanking = async (gameId: string): Promise<Player[] | null> => {
    try {
      const response = await fetch(API_CONFIG.getGameRankingEndpoint(gameId));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const ranking: Player[] = await response.json();
      
      // Atualizar o ranking na lista principal
      setGames(prev => prev.map(game => 
        game.id === gameId ? { ...game, ranking } : game
      ));
      
      return ranking;
    } catch (error) {
      console.error(`Erro ao buscar ranking do jogo ${gameId}:`, error);
      return null;
    }
  };

  // Função para alternar detalhes do jogo
  const toggleGameDetails = useCallback(async (gameId: string): Promise<void> => {
    if (selectedGame === gameId) {
      setSelectedGame(null);
      return;
    }

    // Buscar detalhes do jogo se não estiver em cache
    await fetchGameDetails(gameId);
    setSelectedGame(gameId);
  }, [selectedGame, gameDetailsCache]);

  // Função para atualizar ranking específico
  const refreshGameRanking = useCallback(async (gameId: string): Promise<void> => {
    await fetchGameRanking(gameId);
  }, []);

  // Função de ordenação
  const handleSort = (key: keyof GameData | 'playersCount'): void => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Dados filtrados e ordenados
  const filteredAndSortedGames = useMemo((): GameData[] => {
    let filteredGames = games.filter((game: GameData) =>
      game.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(game.players).some((player: string) => 
        player.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig.key) {
      filteredGames.sort((a: GameData, b: GameData) => {
        let aValue: number | string = a[sortConfig.key as keyof GameData] as number | string;
        let bValue: number | string = b[sortConfig.key as keyof GameData] as number | string;

        if (sortConfig.key === 'playersCount') {
          aValue = Object.keys(a.players).length;
          bValue = Object.keys(b.players).length;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredGames;
  }, [games, searchTerm, sortConfig]);

  // Função para obter o primeiro colocado
  const getTopPlayer = (ranking: Player[]): string => {
    if (!ranking || ranking.length === 0) return 'N/A';
    return ranking[0].name;
  };

  // Calcular estatísticas
  const totalGames = games.length;
  const totalKills = games.reduce((sum: number, game: GameData) => sum + game.totalKills, 0);
  const uniquePlayers = new Set(games.flatMap((game: GameData) => Object.values(game.players))).size;
  const totalWorldKills = games.reduce((sum: number, game: GameData) => sum + game.worldKills, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">Dashboard de Jogos</h1>
          </div>
          <p className="text-gray-300">Visualize estatísticas detalhadas dos jogos e rankings dos jogadores</p>
        </div>

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por ID do jogo ou nome do jogador..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchAllGames}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Carregando...' : 'Atualizar Jogos'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total de Jogos"
            value={totalGames}
            icon={<Trophy className="w-8 h-8" />}
            gradient="from-blue-600 to-blue-700"
            iconColor="text-blue-200"
          />
          <StatsCard
            title="Total de Kills"
            value={totalKills}
            icon={<Target className="w-8 h-8" />}
            gradient="from-green-600 to-green-700"
            iconColor="text-green-200"
          />
          <StatsCard
            title="Jogadores Únicos"
            value={uniquePlayers}
            icon={<Users className="w-8 h-8" />}
            gradient="from-purple-600 to-purple-700"
            iconColor="text-purple-200"
          />
          <StatsCard
            title="World Kills"
            value={totalWorldKills}
            icon={<Skull className="w-8 h-8" />}
            gradient="from-red-600 to-red-700"
            iconColor="text-red-200"
          />
        </div>

        {/* Games Table */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-white font-medium cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                      ID do Jogo
                      <SortIcon column="id" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-white font-medium cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('totalKills')}
                  >
                    <div className="flex items-center gap-2">
                      Total Kills
                      <SortIcon column="totalKills" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-white font-medium cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('playersCount')}
                  >
                    <div className="flex items-center gap-2">
                      Jogadores
                      <SortIcon column="playersCount" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-white font-medium">
                    Primeiro Lugar
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-white font-medium cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('worldKills')}
                  >
                    <div className="flex items-center gap-2">
                      World Kills
                      <SortIcon column="worldKills" sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-white font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedGames.map((game: GameData, index: number) => (
                  <React.Fragment key={game.id}>
                    <tr 
                      className={`border-t border-white/10 hover:bg-white/5 transition-colors ${
                        index % 2 === 0 ? 'bg-white/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{game.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {game.totalKills}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{Object.keys(game.players).length}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span className="text-white font-medium">{getTopPlayer(game.ranking)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          game.worldKills > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {game.worldKills}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleGameDetails(game.id)}
                            disabled={loadingGameDetails.has(game.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-md transition-colors flex items-center gap-1"
                          >
                            {loadingGameDetails.has(game.id) ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                            {selectedGame === game.id ? 'Ocultar' : 'Detalhes'}
                          </button>
                          <button
                            onClick={() => refreshGameRanking(game.id)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors flex items-center gap-1"
                            title="Atualizar ranking"
                          >
                            <Trophy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {selectedGame === game.id && (
                      <tr className="bg-white/10">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Players Scores */}
                            <div>
                              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Pontuações dos Jogadores
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(game.playerScores).map(([player, score]: [string, number]) => (
                                  <div key={player} className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2">
                                    <span className="text-gray-300">{player}</span>
                                    <span className={`font-medium ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {score}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Kill Methods */}
                            <div>
                              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Métodos de Kill
                              </h4>
                              <div className="space-y-2">
                                {Object.keys(game.killsByMeans).length > 0 ? (
                                  Object.entries(game.killsByMeans).map(([method, count]: [string, number]) => (
                                    <div key={method} className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2">
                                      <span className="text-gray-300 text-sm">{method}</span>
                                      <span className="text-white font-medium">{count}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-gray-400 text-sm">Nenhum método de kill registrado</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Ranking Completo */}
                          <div className="mt-6">
                            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                              <Trophy className="w-4 h-4" />
                              Ranking Completo
                            </h4>
                            <div className="bg-white/5 rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {game.ranking.map((player: Player, idx: number) => (
                                  <div key={player.name} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                                        idx === 0 ? 'bg-yellow-500 text-yellow-900' :
                                        idx === 1 ? 'bg-gray-400 text-gray-900' :
                                        idx === 2 ? 'bg-amber-600 text-amber-900' :
                                        'bg-gray-600 text-gray-300'
                                      }`}>
                                        {idx + 1}
                                      </span>
                                      <span className="text-gray-300 text-sm">{player.name}</span>
                                    </div>
                                    <span className={`font-medium text-sm ${player.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {player.score}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredAndSortedGames.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Nenhum jogo encontrado</p>
              <p className="text-gray-500 text-sm mt-2">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamesTable;