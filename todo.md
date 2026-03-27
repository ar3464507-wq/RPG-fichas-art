# RPG Sheet — TODO

## Banco de Dados & Backend
- [x] Schema: tabelas characters, campaigns, campaign_members, character_shares, character_sections, character_attributes, character_resources, character_skills, character_items, character_lore, user_preferences
- [x] Migrations SQL aplicadas
- [x] db.ts: helpers de query para personagens, campanhas, seções, atributos, recursos, habilidades, itens, lore
- [x] routers.ts: procedures para characters (CRUD), campaigns (CRUD), shares, sections, realtime

## Autenticação
- [x] Login com OAuth (Manus/Google)
- [x] Proteção de rotas autenticadas
- [x] Preferências de tema por usuário

## Dashboard
- [x] Layout com sidebar (AppLayout customizado)
- [x] Cards de personagens com imagem, nome, sistema, campanha
- [x] Botões: Abrir, Compartilhar, Duplicar, Deletar
- [x] Botão "Criar Novo Personagem"
- [x] Estado vazio (empty state)

## Editor de Fichas
- [x] Rota /character/:id
- [x] Cabeçalho com imagem do personagem, nome, indicador de usuários online
- [x] Seção: Informações básicas (nome, jogador, nível, classe, origem)
- [x] Seção: Atributos (adicionar/remover/renomear/alterar valor)
- [x] Seção: Recursos (vida, sanidade, energia — barra de progresso + valor)
- [x] Seção: Habilidades (nome + descrição)
- [x] Seção: Inventário (nome, descrição, quantidade)
- [x] Seção: Lore/Anotações (texto livre)
- [x] Campos renomeáveis e removíveis
- [x] Salvamento automático (debounce)
- [x] Upload de imagem do personagem
- [x] Wallpaper da ficha (upload + transparência)
- [x] Botão Compartilhar (link + permissões)
- [x] Indicador de usuários vendo a ficha

## Campanhas
- [x] Rota /campaigns
- [x] Criar campanha (nome, descrição)
- [x] UID único automático
- [x] Link único da campanha (inviteToken)
- [x] Listar personagens da campanha
- [x] Botão compartilhar campanha (link de convite)
- [x] Entrar na campanha via link (/join/:token)

## Compartilhamento & Permissões
- [x] Modal de compartilhamento na ficha
- [x] Gerar link com permissão: visualização ou edição
- [x] Verificar permissão ao abrir ficha via link

## Temas Visuais
- [x] Variáveis CSS globais por tema
- [x] Tema Clássico (dark fantasy dourado)
- [x] Tema Medieval (pergaminhos âmbar)
- [x] Tema Terror (sombrio vermelho)
- [x] Tema Investigação (noir azul)
- [x] Aplicar tema por ficha

## Tempo Real
- [x] Socket.io integrado
- [x] Sincronização de edições na ficha
- [x] Indicador de usuários online na ficha

## Configurações
- [x] Rota /settings
- [x] Seleção de tema global
- [x] Dados da conta

## Testes & Qualidade
- [x] Vitest: testes de routers (characters, campaigns, auth)
- [x] Checkpoint final


## Correções Solicitadas

### Sistema de Temas
- [x] Implementar data-theme no documento HTML
- [x] Adicionar localStorage para persistência de tema
- [x] Corrigir seletor de tema na interface para aplicar visualmente
- [x] Criar CSS para tema Terror (preto, vermelho escuro, cinza)
- [x] Criar CSS para tema Medieval (marrom, bege, dourado)
- [x] Criar CSS para tema Clássico (cinza, branco, azul escuro)
- [x] Criar CSS para tema Investigação (cinza, verde militar, preto)
- [x] Garantir que componentes usem variáveis CSS (--primary, --background, --panel, --text, --border)

### Wallpaper & Transparência
- [x] Corrigir slider de opacidade (100% = invisível, 0% = visível)
- [x] Remover valores fixos de opacity no CSS
- [x] Implementar localStorage para persistência de opacidade
- [x] Aplicar opacidade em tempo real ao arrastar slider

### Edição de Fichas
- [x] Verificar se campos estão readonly
- [x] Garantir edição de informações
- [x] Garantir adição de campos
- [x] Garantir remoção de campos


## Correções Adicionais (Rodada 2)

### Wallpaper - Transparência em Tempo Real
- [x] Corrigir slider para atualizar opacidade imediatamente (sem depender de troca de wallpaper)
- [x] Implementar listener de input no slider
- [x] Salvar valor de opacidade no estado do personagem
- [x] Recuperar e aplicar opacidade ao carregar ficha
- [x] Remover lógica que aplica opacidade apenas na troca de wallpaper

### Informações do Personagem - Campos Dinâmicos
- [x] Adicionar estrutura characterInfo com id, label, value
- [x] Implementar edição de label (nome do campo)
- [x] Implementar edição de value (valor do campo)
- [x] Implementar remoção de campo
- [x] Implementar botão "Adicionar informação"
- [x] Gerar IDs únicos para novos campos
- [x] Salvar characterInfo em JSON na ficha
- [x] Recuperar e exibir characterInfo ao carregar ficha
- [x] Atualizar interface automaticamente ao editar/adicionar/remover


## Rodada 3: Compartilhamento de Campanhas e Privacidade

- [x] Adicionar campo isPrivate no schema de characters
- [x] Criar migration SQL para isPrivate
- [x] Adicionar botão de privacidade na ficha (Lock/LockOpen icon)
- [x] Permitir jogadores adicionarem suas fichas à campanha
- [x] Remover guard isOwner da seção "Adicionar Personagens"
- [x] Implementar permissão de edição para criador da campanha
- [x] Atualizar lógica de canEdit para incluir campaign owner
- [x] Adicionar imports necessários (getDb, campaigns, eq)
- [x] Testes passando (6 testes)


## Rodada 4: Sistema de Perícias e Otimização de Sincronização

### Perícias com Categorias
- [x] Adicionar campo category na tabela character_skills
- [x] Criar migration SQL para category
- [x] Atualizar schema do Drizzle
- [x] Implementar UI de perícias com categoria, nome e valor
- [x] Botão para adicionar perícia em cada categoria
- [x] Edição de categoria, nome e valor
- [x] Remoção de perícia

### Otimização de Sincronização em Tempo Real
- [x] Melhorar Socket.io para emitir mudanças imediatamente
- [x] Implementar refetch automático após mutação
- [x] Remover necessidade de F5 para sincronizar
- [x] Adicionar loading states durante sincronização


## Rodada 5: Correção de Botão de Perícias e Otimização de Performance

### Botão de Adicionar Perícias
- [x] Garantir que botão "Adicionar" aparece em todas as categorias
- [x] Permitir adicionar perícia com nome e valor editáveis
- [x] Sincronizar em tempo real

### Otimização de Performance
- [x] Implementar useMemo para derivações complexas
- [x] Implementar useCallback para callbacks
- [x] Lazy loading de imagens
- [x] Virtualização de listas longas
- [x] Remover re-renders desnecessários
- [x] Otimizar queries do banco
