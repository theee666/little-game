// AI 大逃杀游戏主逻辑

class AIAgent {
    constructor(id, name, emoji, personality, strategy, color, x, y) {
        this.id = id;
        this.name = name;
        this.emoji = emoji;
        this.personality = personality;
        this.strategy = strategy;
        this.color = color;
        this.x = x;
        this.y = y;
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 1;
        this.attack = 10;
        this.defense = 5;
        this.alive = true;
        this.kills = 0;
        this.age = 0;
        this.target = null;
        this.state = 'wandering'; // wandering, chasing, fleeing, attacking
        this.moveCooldown = 0;
        this.attackCooldown = 0;
    }

    update(agents, arenaWidth, arenaHeight) {
        if (!this.alive) return;

        this.age++;
        if (this.moveCooldown > 0) this.moveCooldown--;
        if (this.attackCooldown > 0) this.attackCooldown--;

        // 根据性格和策略决定行为
        this.decideBehavior(agents, arenaWidth, arenaHeight);
        this.executeBehavior(arenaWidth, arenaHeight);
    }

    decideBehavior(agents, arenaWidth, arenaHeight) {
        const aliveAgents = agents.filter(a => a.alive && a.id !== this.id);
        if (aliveAgents.length === 0) return;

        // 根据策略选择目标
        if (this.strategy === 'aggressive') {
            // 寻找最近的敌人
            this.target = this.findNearestAgent(aliveAgents);
            this.state = 'chasing';
        } else if (this.strategy === 'defensive') {
            // 远离战斗，寻找安全位置
            const nearest = this.findNearestAgent(aliveAgents);
            if (nearest && this.distanceTo(nearest) < 150) {
                this.target = nearest;
                this.state = 'fleeing';
            } else {
                this.target = null;
                this.state = 'wandering';
            }
        } else if (this.strategy === 'opportunistic') {
            // 寻找低血量的敌人
            const weakTarget = aliveAgents.find(a => a.health < 50);
            if (weakTarget) {
                this.target = weakTarget;
                this.state = 'chasing';
            } else {
                this.target = this.findNearestAgent(aliveAgents);
                this.state = 'wandering';
            }
        } else if (this.strategy === 'pack') {
            // 寻找同类性格的 AI 组队
            const similarAgent = aliveAgents.find(a => 
                a.personality === this.personality && a.health > 50
            );
            if (similarAgent) {
                this.target = similarAgent;
                this.state = 'following';
            } else {
                this.target = this.findNearestAgent(aliveAgents);
                this.state = 'wandering';
            }
        } else {
            // random strategy
            this.target = Math.random() < 0.3 ? this.findNearestAgent(aliveAgents) : null;
            this.state = 'wandering';
        }

        // 性格影响决策
        if (this.personality === 'cowardly' && this.health < 30) {
            this.state = 'fleeing';
            if (this.target) {
                const nearestThreat = this.findNearestAgent(aliveAgents);
                if (nearestThreat && this.distanceTo(nearestThreat) < 100) {
                    this.target = nearestThreat;
                }
            }
        }

        if (this.personality === 'brave' && this.health < 50) {
            // 勇敢的性格会战斗到死
            this.state = 'attacking';
        }
    }

    executeBehavior(arenaWidth, arenaHeight) {
        if (this.moveCooldown > 0) return;

        const moveSpeed = 4 * this.speed;

        if (this.state === 'chasing' && this.target) {
            this.moveTo(this.target.x, this.target.y, moveSpeed, arenaWidth, arenaHeight);
            
            // 如果足够近，攻击
            if (this.distanceTo(this.target) < 50 && this.attackCooldown <= 0) {
                this.attackTarget(this.target);
            }
        } else if (this.state === 'fleeing' && this.target) {
            // 远离目标
            const fleeX = this.x + (this.x - this.target.x);
            const fleeY = this.y + (this.y - this.target.y);
            this.moveTo(fleeX, fleeY, moveSpeed * 1.2, arenaWidth, arenaHeight);
        } else if (this.state === 'following' && this.target) {
            // 跟随目标但保持距离
            const dist = this.distanceTo(this.target);
            if (dist > 80) {
                this.moveTo(this.target.x, this.target.y, moveSpeed, arenaWidth, arenaHeight);
            } else if (dist < 40) {
                const fleeX = this.x + (this.x - this.target.x);
                const fleeY = this.y + (this.y - this.target.y);
                this.moveTo(fleeX, fleeY, moveSpeed, arenaWidth, arenaHeight);
            }
        } else {
            // 随机游荡
            if (Math.random() < 0.05) {
                this.randomMove(moveSpeed, arenaWidth, arenaHeight);
            }
        }
    }

    moveTo(targetX, targetY, speed, arenaWidth, arenaHeight) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.x += (dx / dist) * speed;
            this.y += (dy / dist) * speed;
        }

        // 边界检查
        this.x = Math.max(20, Math.min(arenaWidth - 20, this.x));
        this.y = Math.max(20, Math.min(arenaHeight - 20, this.y));
        
        this.moveCooldown = 3;
    }

    randomMove(speed, arenaWidth, arenaHeight) {
        const angle = Math.random() * Math.PI * 2;
        const newX = this.x + Math.cos(angle) * speed * 20;
        const newY = this.y + Math.sin(angle) * speed * 20;
        this.moveTo(newX, newY, speed, arenaWidth, arenaHeight);
    }

    attackTarget(target) {
        if (!target.alive) return;

        const damage = Math.max(1, this.attack - target.defense / 2);
        const actualDamage = Math.floor(damage * (0.8 + Math.random() * 0.4));
        
        target.takeDamage(actualDamage, this);
        this.attackCooldown = 15;

        // 性格影响攻击
        if (this.personality === 'brutal') {
            target.takeDamage(Math.floor(actualDamage * 0.3), this);
        }
    }

    takeDamage(amount, attacker) {
        this.health -= amount;
        
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            if (attacker) {
                attacker.kills++;
            }
            game.onAIEliminated(this, attacker);
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    findNearestAgent(agents) {
        let nearest = null;
        let minDist = Infinity;

        for (const agent of agents) {
            const dist = this.distanceTo(agent);
            if (dist < minDist) {
                minDist = dist;
                nearest = agent;
            }
        }

        return nearest;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('arena');
        this.ctx = this.canvas.getContext('2d');
        this.agents = [];
        this.isRunning = false;
        this.isPaused = false;
        this.round = 0;
        this.startTime = null;
        this.gameInterval = null;
        this.selectedPower = null;
        this.speed = 5;
        
        this.personalities = [
            { name: 'brave', label: '勇敢', trait: '战斗到最后一刻' },
            { name: 'cowardly', label: '胆小', trait: '低血量时逃跑' },
            { name: 'brutal', label: '残暴', trait: '造成额外伤害' },
            { name: 'cautious', label: '谨慎', trait: '优先防御' },
            { name: 'friendly', label: '友好', trait: '较少主动攻击' }
        ];

        this.strategies = [
            { name: 'aggressive', label: '进攻型', trait: '主动追击敌人' },
            { name: 'defensive', label: '防御型', trait: '避开战斗' },
            { name: 'opportunistic', label: '机会主义', trait: '专挑弱者下手' },
            { name: 'pack', label: '团队型', trait: '寻找同类组队' },
            { name: 'random', label: '随机', trait: '行为不可预测' }
        ];

        this.colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FFD700',
            '#FF4500', '#1E90FF', '#FF1493', '#00FA9A', '#DC143C'
        ];

        this.emojis = ['🤖', '👾', '🤖', '👻', '👽', '🤖', '👾', '🤖', '👻', '👽', 
                       '🤖', '👾', '🤖', '👻', '👽', '🤖', '👾', '🤖', '👻', '👽'];

        this.names = [
            'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
            'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
            'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron',
            'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon'
        ];

        this.resizeCanvas();
        this.setupEventListeners();
        this.initAgents();
        this.render();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    initAgents() {
        this.agents = [];
        
        for (let i = 0; i < 20; i++) {
            const personality = this.personalities[Math.floor(Math.random() * this.personalities.length)];
            const strategy = this.strategies[Math.floor(Math.random() * this.strategies.length)];
            
            const x = 50 + Math.random() * (this.canvas.width - 100);
            const y = 50 + Math.random() * (this.canvas.height - 100);
            
            const agent = new AIAgent(
                i,
                this.names[i],
                this.emojis[i],
                personality,
                strategy,
                this.colors[i],
                x,
                y
            );

            // 性格影响属性
            if (personality.name === 'brave') {
                agent.attack += 3;
                agent.defense -= 1;
            } else if (personality.name === 'cowardly') {
                agent.speed += 0.3;
                agent.defense += 2;
            } else if (personality.name === 'brutal') {
                agent.attack += 5;
                agent.health = 80;
                agent.maxHealth = 80;
            } else if (personality.name === 'cautious') {
                agent.defense += 4;
                agent.attack -= 2;
            }

            this.agents.push(agent);
        }

        this.updateUI();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });

        document.getElementById('btn-start').addEventListener('click', () => this.start());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-reset').addEventListener('click', () => this.reset());
        
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            if (this.isRunning && !this.isPaused) {
                this.stopGameLoop();
                this.startGameLoop();
            }
        });

        document.querySelectorAll('.god-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.god-btn').forEach(b => b.classList.remove('active'));
                
                if (this.selectedPower === e.target.dataset.power) {
                    this.selectedPower = null;
                } else {
                    this.selectedPower = e.target.dataset.power;
                    e.target.classList.add('active');
                }
            });
        });

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            document.getElementById('tooltip').style.display = 'none';
        });
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!this.selectedPower) return;

        for (const agent of this.agents) {
            if (!agent.alive) continue;

            const dist = Math.sqrt((x - agent.x) ** 2 + (y - agent.y) ** 2);
            if (dist < 30) {
                this.useGodPower(agent);
                break;
            }
        }
    }

    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const tooltip = document.getElementById('tooltip');
        let foundAgent = null;

        for (const agent of this.agents) {
            if (!agent.alive) continue;

            const dist = Math.sqrt((x - agent.x) ** 2 + (y - agent.y) ** 2);
            if (dist < 30) {
                foundAgent = agent;
                break;
            }
        }

        if (foundAgent) {
            tooltip.innerHTML = `
                <div class="tooltip-name">${foundAgent.emoji} ${foundAgent.name}</div>
                <div class="tooltip-stat"><span class="stat-label">性格:</span> <span class="stat-value">${foundAgent.personality.label}</span></div>
                <div class="tooltip-stat"><span class="stat-label">策略:</span> <span class="stat-value">${foundAgent.strategy.label}</span></div>
                <div class="tooltip-stat"><span class="stat-label">生命值:</span> <span class="stat-value">${Math.floor(foundAgent.health)}/${foundAgent.maxHealth}</span></div>
                <div class="tooltip-stat"><span class="stat-label">击杀数:</span> <span class="stat-value">${foundAgent.kills}</span></div>
                <div class="tooltip-stat"><span class="stat-label">状态:</span> <span class="stat-value">${this.translateState(foundAgent.state)}</span></div>
            `;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    }

    translateState(state) {
        const states = {
            'wandering': '游荡',
            'chasing': '追击',
            'fleeing': '逃跑',
            'attacking': '攻击',
            'following': '跟随'
        };
        return states[state] || state;
    }

    useGodPower(agent) {
        if (this.selectedPower === 'heal') {
            agent.heal(30);
            this.logEvent(`${agent.name} 被上帝治疗了 +30HP`, 'heal');
        } else if (this.selectedPower === 'damage') {
            agent.takeDamage(30, null);
            this.logEvent(`${agent.name} 被上帝惩罚了 -30HP`, 'combat');
        } else if (this.selectedPower === 'speed') {
            agent.speed *= 1.5;
            this.logEvent(`${agent.name} 获得上帝加速`, 'god');
        } else if (this.selectedPower === 'slow') {
            agent.speed *= 0.5;
            this.logEvent(`${agent.name} 被上帝减速`, 'god');
        }

        this.selectedPower = null;
        document.querySelectorAll('.god-btn').forEach(b => b.classList.remove('active'));
        this.updateUI();
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.startGameLoop();
        document.getElementById('btn-start').textContent = '运行中';
        this.logEvent('游戏开始！20 个 AI 的生存竞赛', 'god');
    }

    togglePause() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.stopGameLoop();
            document.getElementById('btn-pause').textContent = '继续';
            this.logEvent('游戏暂停', 'god');
        } else {
            this.startGameLoop();
            document.getElementById('btn-pause').textContent = '暂停';
            this.logEvent('游戏继续', 'god');
        }
    }

    reset() {
        this.stopGameLoop();
        this.isRunning = false;
        this.isPaused = false;
        this.round = 0;
        this.startTime = null;
        document.getElementById('btn-start').textContent = '开始游戏';
        document.getElementById('btn-pause').textContent = '暂停';
        document.getElementById('winner-modal').style.display = 'none';
        document.getElementById('event-log').innerHTML = '';
        
        this.initAgents();
        this.render();
        this.updateUI();
    }

    startGameLoop() {
        const interval = Math.max(20, 300 - (this.speed * 25));
        this.gameInterval = setInterval(() => this.gameLoop(), interval);
    }

    stopGameLoop() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
    }

    gameLoop() {
        if (this.isPaused) return;

        this.round++;
        
        // 更新所有 AI
        for (const agent of this.agents) {
            agent.update(this.agents, this.canvas.width, this.canvas.height);
        }

        // 检查胜利条件
        const aliveAgents = this.agents.filter(a => a.alive);
        if (aliveAgents.length === 1) {
            this.endGame(aliveAgents[0]);
            return;
        } else if (aliveAgents.length === 0) {
            this.endGame(null);
            return;
        }

        // 随机事件
        if (Math.random() < 0.02) {
            this.triggerRandomEvent();
        }

        this.render();
        this.updateUI();
    }

    triggerRandomEvent() {
        const events = [
            { name: '毒气扩散', effect: () => {
                this.agents.forEach(a => {
                    if (a.alive) a.takeDamage(5, null);
                });
                this.logEvent('⚠️ 毒气扩散！所有 AI 受到 5 点伤害', 'combat');
            }},
            { name: '治疗波', effect: () => {
                this.agents.forEach(a => {
                    if (a.alive) a.heal(10);
                });
                this.logEvent('💚 治疗波！所有 AI 恢复 10 点生命', 'heal');
            }},
            { name: '狂暴区域', effect: () => {
                const randomAgent = this.agents.filter(a => a.alive)[Math.floor(Math.random() * this.agents.filter(a => a.alive).length)];
                if (randomAgent) {
                    randomAgent.attack += 5;
                    this.logEvent(`⚡ ${randomAgent.name} 进入狂暴状态！攻击力提升`, 'god');
                }
            }},
            { name: '安全区缩小', effect: () => {
                this.logEvent('🔴 安全区缩小！AI 们开始移动', 'god');
            }}
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        event.effect();
    }

    onAIEliminated(agent, killer) {
        const aliveCount = this.agents.filter(a => a.alive).length;
        
        if (killer) {
            this.logEvent(`💀 ${agent.name} 被 ${killer.name} 淘汰 (剩余：${aliveCount})`, 'elimination');
        } else {
            this.logEvent(`💀 ${agent.name} 被淘汰 (剩余：${aliveCount})`, 'elimination');
        }
    }

    endGame(winner) {
        this.stopGameLoop();
        this.isRunning = false;

        const modal = document.getElementById('winner-modal');
        const winnerAvatar = document.getElementById('winner-avatar');
        const winnerName = document.getElementById('winner-name');
        const winnerDesc = document.getElementById('winner-desc');

        if (winner) {
            const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;

            winnerAvatar.textContent = winner.emoji;
            winnerName.textContent = `🏆 ${winner.name}`;
            winnerDesc.innerHTML = `
                性格：${winner.personality.label} | 策略：${winner.strategy.label}<br>
                击杀数：${winner.kills} | 存活时间：${minutes}分${seconds}秒
            `;
            
            this.logEvent(`🏆 冠军诞生！${winner.name} 赢得了比赛！`, 'god');
        } else {
            winnerAvatar.textContent = '💀';
            winnerName.textContent = '无人幸存';
            winnerDesc.textContent = '所有 AI 都被淘汰了...';
        }

        modal.style.display = 'flex';
    }

    logEvent(message, type) {
        const log = document.getElementById('event-log');
        const eventItem = document.createElement('div');
        eventItem.className = `event-item ${type}`;
        eventItem.textContent = `[${this.round}] ${message}`;
        log.insertBefore(eventItem, log.firstChild);

        // 保持日志数量
        while (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
    }

    updateUI() {
        const aliveAgents = this.agents.filter(a => a.alive);
        document.getElementById('alive-count').textContent = aliveAgents.length;
        document.getElementById('round-count').textContent = this.round;

        if (this.startTime) {
            const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            document.getElementById('game-time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // 更新 AI 列表
        const aiList = document.getElementById('ai-list');
        aiList.innerHTML = '';

        // 按存活状态和击杀数排序
        const sortedAgents = [...this.agents].sort((a, b) => {
            if (a.alive !== b.alive) return b.alive - a.alive;
            return b.kills - a.kills;
        });

        for (const agent of sortedAgents) {
            const entry = document.createElement('div');
            entry.className = `ai-entry ${agent.alive ? '' : 'eliminated'}`;
            entry.innerHTML = `
                <div class="ai-avatar" style="background: ${agent.color}; border-color: ${agent.color}">
                    ${agent.emoji}
                </div>
                <div class="ai-details">
                    <div class="ai-name">${agent.name}</div>
                    <div class="ai-status">${agent.personality.label} · ${agent.strategy.label} · 击杀：${agent.kills}</div>
                    <div class="ai-health">
                        <div class="ai-health-bar" style="width: ${(agent.health / agent.maxHealth) * 100}%"></div>
                    </div>
                </div>
            `;
            aiList.appendChild(entry);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格背景
        this.drawGrid();

        // 绘制所有 AI
        for (const agent of this.agents) {
            this.drawAgent(agent);
        }

        // 绘制神之力量指示
        if (this.selectedPower) {
            this.drawPowerIndicator();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const gridSize = 50;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawAgent(agent) {
        // 绘制光环
        const gradient = this.ctx.createRadialGradient(
            agent.x, agent.y, 15,
            agent.x, agent.y, 30
        );
        gradient.addColorStop(0, agent.color + '40');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(agent.x, agent.y, 30, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制 AI 本体
        this.ctx.fillStyle = agent.color;
        this.ctx.beginPath();
        this.ctx.arc(agent.x, agent.y, 20, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制边框
        this.ctx.strokeStyle = agent.color;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 绘制 emoji
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(agent.emoji, agent.x, agent.y);

        // 绘制生命条
        if (agent.health < agent.maxHealth) {
            const barWidth = 40;
            const barHeight = 4;
            const barX = agent.x - barWidth / 2;
            const barY = agent.y - 30;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = agent.health / agent.maxHealth;
            const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ff9800' : '#ff4444';
            this.ctx.fillStyle = healthColor;
            this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }

        // 绘制状态指示
        if (agent.state === 'chasing' && agent.target) {
            this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(agent.x, agent.y);
            this.ctx.lineTo(agent.target.x, agent.target.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    drawPowerIndicator() {
        this.ctx.fillStyle = 'rgba(0, 217, 255, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'rgba(0, 217, 255, 0.5)';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('点击 AI 施加神之力量', this.canvas.width / 2, 30);
    }
}

// 启动游戏
const game = new Game();
