---
title: 虚拟网络接口TUN模式的技术原理、性能剖析与架构对比研究
date: 2026-05-14 21:53:59
categories:
  - 技术
tags:
  - TUN
  - 代理
  - 网络
  - VPN
---

> 本文由 Gemini 3.1 Pro 纯 AI 生成，未经过人工校核。内容准确性请自行验证。

# 虚拟网络接口TUN模式的技术原理、性能剖析与架构对比研究

## 引言

虚拟网络接口（Virtual Network Interface）是构建 VPN、零信任网络架构和透明代理的核心技术。传统应用层代理在全局流量接管和复杂网络协议栈穿透方面存在局限。TUN（Network TUNnel）和 TAP（Network TAP）设备在操作系统底层协议栈介入，可在这些场景中实现更底层的流量管控。

本文分析 TUN 模式的数据包流转机制、性能开销、健壮性设计（路由环路与 DNS 污染防御、操作系统工具链适配），并与本地端口监听（SOCKS5/HTTP）、系统环境代理、应用内配置及内核级进程代理（如 ProxyBridge）等方案进行对比。

## 虚拟网络设备的底层工作机制与OSI层级介入

要理解 TUN 模式，需要明确其在开放式系统互联通信参考模型（OSI Model）中所处的层级及其与物理硬件设备的区别。

### 操作系统层面的网络设备抽象

在计算机网络工程中，TUN与TAP均属于内核态的虚拟网络设备。与依赖物理网络接口卡（NIC）并由硬件处理电信号收发的常规网络设备不同，虚拟网络设备完全由软件驱动支撑[^1]。这一架构理念最初在2000年被整合为通用TUN/TAP驱动（Universal TUN/TAP Driver），并作为Linux与FreeBSD内核的标准组成部分持续维护至今[^1]。

尽管 TUN 与 TAP 均服务于网络隧道化目的，但二者在操作系统网络栈中截获与传输数据包的层级存在差异，因此无法在同一应用场景中混用[^1]。TAP设备模拟的是数据链路层（OSI第二层）设备，专门用于承载以太网帧（Ethernet frames），其工作机制保留了源与目的的物理介质访问控制（MAC）地址，通常用于构建用户空间网络桥接或处理基于非IP协议的底层通信[^1]。相比之下，TUN设备模拟的是网络层（OSI第三层）设备，专注于承载与路由IP数据包（IP packets）[^1]。由于绝大多数互联网应用建立在 TCP/IP 协议簇之上，TUN 模式剥离了冗余的数据链路层封装，仅处理 IPv4 或 IPv6 数据负载，这使得它在跨物理网络的路由与代理穿透中效率更高[^1]。

### 隧道化与数据包封装机制

网络隧道（Network Tunneling）的核心在于封装（Encapsulation），即通过重打包流量数据来隐藏其原始性质，或使不受当前底层网络支持的协议能够顺利通行[^3]。当操作系统通过TUN设备发送数据包时，这些数据包并不会直接流向物理网卡，而是被交付给一个主动附着（Attaches）在该虚拟设备上的用户空间程序（如VPN客户端或代理内核）[^1]。

在这个过程中，隧道协议运行在底层网络栈之上，利用底层网络的数据包有效载荷部分来运载被隧道化的数据包[^3]。例如，基于IP-in-IP协议或现代加密隧道技术（如WireGuard、VLESS），代理程序会在原始IP包外部附加一个新的头部（Outer Header），该头部包含了隧道入口点的源IP与隧道出口点的目的IP[^3]。反之，用户空间程序也可以将数据包直接"注入"（Inject）到TUN设备中，操作系统的网络栈会将其视作从外部物理来源接收到的合法数据包，从而触发标准的路由与交付流程[^1]。

## TUN 模式下的数据流转链条长度详解

在传统的直接网络通信架构中，数据的流转路径较短。用户态的应用程序发起系统调用（如 write 或 sendmsg），数据进入内核空间，由内核TCP/IP协议栈进行分段与封装，并通过物理网卡的直接内存访问（DMA）机制发送至物理链路[^4]。此路径仅发生一次从用户空间到内核空间的上下文跨越[^6]。当引入TUN模式实现透明代理时，数据包的流转路径被拉长，形成了一个"U型"处理轨迹。

### 流转链条的阶段拆解

1. **出站生成与第一次拦截**：应用程序在用户模式（Ring 3）下生成应用层数据，发起系统调用进入内核模式（Ring 0）[^7]。内核网络栈将数据封装为标准IP数据包，并通过查询被代理工具修改过的系统全局路由表，判定该IP包的下一跳出口为虚拟接口 tun0[^8]。  
2. **内核到用户的反向提取**：IP数据包抵达TUN设备后，不再继续向硬件底层传递。相反，监听该TUN设备字符文件（通常为 /dev/net/tun）的用户态代理进程将被唤醒，通过执行 read 系统调用，将这些原始IP数据包从内核空间重新拷贝回用户空间[^2]。  
3. **用户态协议栈的深度解析**：代理进程此时获得的是网络层的Raw IP Packets。由于绝大多数代理协议（如SOCKS5或HTTP）仅能处理传输层或应用层负载，代理程序必须内置并运行一套完整的用户态TCP/IP协议栈（例如gVisor的netstack子系统或lwIP库）[^8]。该用户态协议栈负责维护庞大且复杂的TCP状态机，重组TCP分段，处理乱序与重传，最终从中剥离出纯粹的应用程序负载数据[^8]。  
4. **加密隧道封装**：获取到负载数据后，代理进程根据预设的安全策略，使用TLS、QUIC或自定义混淆协议对数据进行加密，并将其封装入新的代理协议数据单元中[^8]。  
5. **二次系统调用与真实出站**：代理进程生成新的TCP或UDP数据包，并向真实的远程代理服务器地址发起连接。这要求代理进程再次通过Socket系统调用，将加密后的新数据包送回操作系统的内核空间[^2]。  
6. **物理链路传输**：内核网络栈处理这些新生成的套接字数据，通过真实的物理网卡及MAC层协议将其发送至广域网[^4]。

TUN 模式下的数据包至少经历了"用户态 -> 内核态 -> 用户态 -> 内核态"的四次边界穿越。这种链条增长是 TUN 模式性能开销的来源。

## TUN模式对网络性能的影响

架构复杂性的提升引入了性能损耗。TUN 模式对网络性能的影响体现在上下文切换频率、内存拷贝开销、排队延迟机制以及拥塞控制算法冲突等多个层面。

### 上下文切换与内存拷贝开销

在现代高并发操作系统中，用户空间与内核空间之间的上下文切换（Context Switch）是开销较大的操作。微观基准测试表明，在多核处理器上单次上下文切换通常耗时约 5 微秒[^13]。频繁的跨特权级切换会触发 TLB 刷新，并导致处理器缓存的未命中率上升[^15]。

与上下文切换相伴的是数据拷贝成本。在Linux内核的常规处理流程中，网卡接收到的数据被存放在 sk_buff（Socket Buffer）结构中，协议栈各层仅通过传递指针引用来进行处理，基本实现了内核域的"零拷贝"[^5]。然而，TUN设备缺乏将此类直接映射暴露给用户空间原生应用的能力，数据包进出TUN接口必须在内核内存区与用户进程缓冲区之间进行物理拷贝[^20]。在千兆甚至万兆的宽带环境下，每秒可能产生大量中断请求与读写操作。虽然现代内核引入了NAPI机制，允许驱动程序在需要时回退至轮询模式[^19]，但跨越内核边界的数据复制仍会使CPU达到饱和，成为隧道网络吞吐量的瓶颈。

### TCP over TCP 问题

除了计算资源消耗，网络协议自身的耦合冲突也是 TUN 性能下降的诱因。若代理软件采用 TCP 传输协议（如未经优化的 OpenVPN TCP 模式或 SSH 隧道）来承载被 TUN 接口截获的内层 TCP 流量，即构成"TCP over TCP"架构问题[^8]。

传输控制协议（TCP）的核心在于通过序列号确认、超时重传以及拥塞窗口（Congestion Window）机制来保证数据的可靠交付与网络的公平性。在层叠架构中，内层TCP（应用程序）与外层TCP（代理隧道）各自维护一套完全独立的拥塞控制与往返时间（RTT）估算状态机[^8]。当外层跨国链路因物理距离或网络波动发生丢包时，外层TCP理所当然地进入重传阶段并削减发送速率。然而，这种暂时的阻塞会导致内层TCP的确认报文（ACK）迟迟无法到达。一旦超过内层TCP的超时重传阈值，内层TCP便会误以为网络发生严重拥塞，进而触发大规模的数据包重传[^8]。

此时，外层 TCP 必须将这些重传数据加入发送队列，加剧了链路的拥塞，最终导致双层协议性能下降，网络带宽利用率降低，且伴随明显的延迟堆叠[^8]。

### 用户态协议栈重构与传输优化策略

针对 TCP over TCP 的问题，现代 TUN 代理（如采用 Mihomo 内核或 Surge 等）引入了用户态协议栈（如 gVisor netstack）。代理工具在本地拦截到应用程序的 TCP SYN 请求后，直接在本地与之完成三次握手。这意味着，应用程序原本期望与远端服务器建立的端到端 TCP 连接，被"终结（Terminate）"在本地的代理进程中[^8]。

通过这种"一对一连接映射"（One-to-One Connection Mapping），内层 TCP 状态机的覆盖范围被压缩至本地环回段（Local Loopback），其 RTT 为微秒级且几乎零丢包[^8]。代理程序随后剥离出应用程序负载，再通过自身优化的加密通道（如基于 UDP 的 QUIC 协议，或经多路复用优化的 VLESS/WebSocket 通道）发送至远端服务器[^8]。测试数据表明，TCP over QUIC 隧道在 20% 以上数据包丢失的网络环境下，其吞吐量仍优于原生 TCP 直连或 TCP 套 TCP 隧道[^12]。通过在本地提前终结 TCP 状态，可以规避拥塞控制冲突，并允许代理网络使用自定义路由算法和重传机制应对弱网环境，从而提升吞吐率并降低延迟堆叠。

## 影响范围：全局透明覆盖

TUN 模式的优势在于其影响范围。由于其工作在 OSI 模型的最底层，它能够实现全局透明代理。

在常规配置下，许多软件（特别是老旧工具、特定语言运行时的HTTP Client，或具备高度定制网络协议栈的客户端）并不会主动读取操作系统注册表或环境变量中的代理配置。但在TUN模式下，无论是基于UDP的实时音视频流、依赖ICMP探测的网络连通性测试命令（如Ping工具），还是硬编码绕过代理库的专属协议，只要其数据必须经过底层系统的路由表进行出口投递，就必然会被无条件重定向至虚拟的 tun0 网卡接口[^8]。这种机制对于容器化环境（Docker）中的网络穿透、复杂游戏串流的代理支持、以及抵御恶意软件探测均具有业务价值，消除了"部分应用不走代理"的问题[^8]。

## 健壮性分析：网络层抗击打能力与工具链适配挑战

TUN 模式接管了流量和系统路由，配置或路由逻辑出错可能导致系统断网，因此其健壮性设计很重要。

### 网络层面的健壮性与防反噬机制

#### 路由环路（Routing Loop）与 SO_MARK 隔离

当TUN虚拟网卡被设置为系统默认路由时，所有向外发送的IP数据包都会进入代理软件。然而，代理软件在将流量加密后，需要向真实的远程服务器发送数据。如果不加区分，这些由代理软件本身发出的数据包同样会被系统底层认为需要匹配默认路由，从而再次被送入TUN接口[^23]。这种"自我代理循环（Self-proxy loop）"会在几毫秒内消耗尽CPU与内存资源，导致系统瘫痪[^23]。

为了防范路由环路，现代代理工具在 Linux 及类 Unix 系统中使用套接字标记（Socket Mark）与策略路由（Policy Routing）机制。代理程序在发起外发网络请求前，会利用 SO_MARK 选项为其Socket打上特定标记（如 fwmark 100）[^24]。随后在系统中建立策略路由规则（ip rule），指示带有该标记的数据包直接通过物理网卡发往本地网关[^24]。通过这种标记与分流隔离，TUN 模式避免了路由循环。

#### DNS泄漏阻断与 Fake-IP

域名解析安全是影响 TUN 模式可靠性的另一因素。在传统旁路代理机制下，操作系统通常向 ISP 分配的本地 DNS 服务器发起解析请求，这可能导致隐私泄漏，且可能遭受 DNS 投毒攻击[^8]。

TUN 模式下的客户端通常默认启用 Fake-IP 技术[^8]。由于TUN接管了全局流量，当它捕获到目标端口为53的DNS UDP请求时，代理工具并不立刻进行远程解析，而是直接从一个预先配置好的保留地址池（如RFC 1918规定的私有地址 198.18.0.0/15）中分配一个虚假IP，并将其作为DNS响应迅速返回给应用程序[^8]。同时，代理程序在内部哈希表中记录下该虚假IP与原始域名的映射关系。

当应用程序随后尝试连接该虚假IP时，发出的TCP SYN数据包被TUN接口捕获，代理工具读取目的虚假IP，反向查表获取真实域名，并直接将携带域名的请求封装发送至远端代理节点进行远程解析与连接[^8]。这一前置劫持机制阻断了本地 DNS 污染的可能性，即使网络环境受限，也能保障代理连接成功率。

### 操作系统工具链的更迭与更新适配健壮性

网络层面的健壮性可以通过软件算法解决，但操作系统底层更新是对 TUN 模式的更大考验。操作系统的驱动架构更迭往往不向前兼容，给第三方工具链维护带来冲击。

#### Windows 生态：从 NDIS 到 Wintun

在 Windows 平台上，早期的虚拟网卡驱动（如 OpenVPN 的 TAP-Windows）依赖于 NDIS 架构[^27]。NDIS 是一个庞大的内核协议标准，驱动开发者需要实现大量的数据链路层功能抽象与中间层过滤逻辑[^28]。这种高度耦合导致版本兼容性差（例如，针对 NDIS 5 编写的 XP 驱动无法在 NDIS 6 系统上运行[^30]）。此外，NDIS 中断处理例程在解析异常数据包时若发生内存越界，系统会蓝屏崩溃（BSOD），这是早年 VPN 客户端频繁导致系统死机的主因[^31]。

WireGuard 项目团队为此开发了 **Wintun** 驱动[^32]。Wintun 的设计放弃了对 OSI 第二层以太网帧的模拟，专注于第三层 IP 数据包传输[^33]。通过环形缓冲区（Ring Buffer）在用户态与内核态之间建立数据交换通道，Wintun 减少了内核执行代码量[^33]。由于不涉及底层 MAC 重写与网络栈注入，Wintun 在 Windows 大版本更新中保持了跨版本兼容性，并将网络吞吐量提升了数倍，现已成为 Windows 端构建 TUN 模式的常用选择[^35]。

#### macOS 平台：KEXT 的消亡与 NetworkExtension

macOS 上的底层网络过滤与隧道构建长期依赖于内核扩展（Kernel Extensions, KEXT）[^37]。第三方 KEXT 运行在与内核相同的最高特权级别，任何代码缺陷都可能引发 Kernel Panic，导致系统崩溃，并可能成为安全漏洞的入口[^38]。

苹果从 macOS Catalina（10.15）开始废除 KEXT，强制开发者向用户空间的 **系统扩展（System Extensions）** 和 **NetworkExtension 框架** 迁移[^39]。这一变化使代理工具崩溃时不再影响整个操作系统，理论上提升了 OS 层面的稳定性[^41]。

然而，这实际上将工具链的兼容性交由苹果的闭源 API 掌控，第三方开发者丧失了修复底层异常的能力。在 macOS 15.0 Sequoia 中，苹果重构的内置防火墙逻辑存在底层缺陷，导致基于 NetworkExtension 的第三方防火墙、虚拟机网络组件、企业 VPN 以及 TUN 代理客户端在处理 UDP 协议或特定流量时发生冲突，出现网络断流、DNS 解析失败、应用假死等问题[^43]。第三方工具开发者除了建议用户关闭系统防火墙外，只能等待苹果发布修复补丁[^44]。这一案例表明，依赖单一封闭 API 的代理工具链，在系统重大更新时的抗风险能力较为脆弱。

#### 服务模式（Service Mode）的权限管理

创建虚拟网卡和更改全局路由表属于特权操作，普通用户权限下的应用程序无法执行[^49]。若代理客户端在临时提权后运行，一旦崩溃退出，系统路由表会因 TUN 网卡失效而导致断网[^49]。为防范此风险，代理工具可启用 **服务模式（Service Mode）**，在系统守护进程层级常驻一个具有管理员权限的辅助程序[^51]。当侦测到主隧道进程异常终止时，该辅助服务能清理残留的虚拟网卡资源并恢复系统默认路由表。

## 代理架构范式横向对比：TUN模式与传统及混合方案的权衡

以下将 TUN 模式与当前主流的其他代理实现路径进行对比。

### 1. 本地拉起端口监控（SOCKS5 / HTTP Proxy）

客户端程序在系统本地监听一个环回地址端口（如 127.0.0.1:1080），将请求转换为 SOCKS5 或 HTTP 协议并发送至远端服务器[^52]。

* **优势与性能上限**：由于运行在 OSI 应用层或会话层，这类代理不需要干预操作系统的网络层栈，避免了数据包拦截与跨域拷贝[^52]。对于仅需代理网页浏览的场景，其吞吐量上限最高，CPU 占用低[^54]。  
* **局限性**：缺乏透明性。应用程序必须原生支持并显式配置 SOCKS5/HTTP 代理。对于不支持代理设置的命令行工具或厚客户端，此方案不适用[^52]。

### 2. 操作系统环境代理（System Proxy / PAC 文件）

在此方案中，代理工具向操作系统注册全局代理环境变量（如Linux的 HTTP_PROXY，或Windows中利用WinINET配置注册表全局代理），有时辅以WPAD或PAC脚本以实现基于域名的动态分流[^57]。

* **机制漏洞与逃逸风险**：系统代理只是一个配置宣告，而非强制拦截。绝大多数基于Chromium内核构建的跨平台应用、自带独立网络栈运行库的进程，或是使用底层Socket通信的工具，均会直接无视这些环境变量，从而产生流量逃逸[^59]。  
* **安全性隐患**：PAC 脚本若通过非加密通道下发，可能被中间人篡改，将特定网络请求重定向至恶意节点[^58]。

### 3. 应用内独立配置（In-App Setup）

用户直接在特定软件（如Telegram、特定浏览器插件如SwitchyOmega）内部指定代理服务器参数。

* **隔离度好**：此类模式不修改宿主操作系统的全局配置，崩溃或异常对系统环境无副作用，健壮性好。  
* **运维复杂度高**：在批量接管开发环境或虚拟机集群流量时，逐一修改每个工具的网络配置会非常繁琐。

### 4. 混合架构方案：基于内核拦截的进程级代理（以 ProxyBridge 为例）

近年来，开源社区出现了一种介于纯应用层端口代理与全局TUN虚拟网卡之间的混合架构方案，其典型代表为 ProxyBridge。这类工具通常被设计为 Proxifier 的开源替代品。

* **工作原理与拦截机制**：ProxyBridge 并没有创建完整的虚拟 TUN 网卡设备，也没有重写系统的全局路由表。相反，它利用操作系统底层的网络包过滤 API（如 Windows 的 WinDivert、macOS 的 Network Extension、Linux 的 Netfilter NFQUEUE）在内核级别直接拦截特定进程的网络数据包。拦截后，它将这些流量（包括 TCP 和 UDP）在用户态重定向到指定的本地 SOCKS5 或 HTTP 代理接口。  
* **优势**：它具备类似 TUN 模式的强制接管能力，不支持代理设置的应用程序流量也会被底层截获，且支持传统 HTTP 代理无法处理的 UDP 流量转发。同时，它可以基于进程名称、IP 范围或端口进行定向路由分流，避免了 TUN 模式下因修改全局路由表引发的路由循环以及与企业级 VPN 的冲突风险。  
* **工具链健壮性与性能挑战**：其健壮性同样受制于底层环境的稳定性。在早期版本中，曾出现程序崩溃时内核驱动无法正常卸载的问题，以及流量峰值时的高 CPU 和内存泄漏。经过优化后，此类架构已能稳定处理 2.5Gbps 级别的网络吞吐量，但部署和运行仍需要管理员特权，且在操作系统大版本更新时，面临与 TUN 模式相似的驱动适配问题。

### 架构方案综合对比矩阵

下表对四种代理方案的核心指标进行对比：

| 评估维度 | 本地监听代理 (SOCKS5/HTTP) | 操作系统全局代理 (System Proxy) | 内核级进程代理 (ProxyBridge等) | 全局虚拟网卡模式 (TUN Mode) |
| :---- | :---- | :---- | :---- | :---- |
| **OSI模型介入深度** | 会话层/应用层 (Layer 5/7) | 应用层，依赖OS高级网络API封装 | 链路/网络层底层包拦截，应用层路由 | 网络层 (Layer 3)，拦截原始IP数据包 |
| **流量覆盖能力** | 低（需应用主动兼容支持） | 中等（自带独立网络栈应用可逃逸） | 高（按进程/IP精确强制接管） | 高（接管所有底层路由IP流量） |
| **协议普适性** | 仅限TCP流及受限的UDP映射 | 绝大多数仅限HTTP/HTTPS及FTP | 全协议兼容（支持UDP/TCP强制转发） | 全协议兼容（TCP、UDP、ICMP等） |
| **性能极限损耗** | 低（支持内核级零拷贝） | 低（附加路由判定逻辑） | 中等（需跨域处理包） | 较高（因频繁跨域拷贝与协议栈重构） |
| **提权与系统侵入度** | 无需提权，普通用户进程级隔离 | 偶尔需轻度提权修改系统环境变量 | 高侵入性（需Root/Admin加载底层驱动） | 高侵入性（需Root/Admin修改路由与网卡） |
| **路由冲突风险** | 无 | 低 | 低（仅针对特定进程流） | 较高（可能发生全局路由循环） |
| **底层工具链故障后果** | 局限于代理工具自身的应用层崩溃退出 | 工具崩溃可能残留错误配置，致部分应用断网 | 驱动未卸载可能导致特定应用断流及系统卡顿 | 工具或驱动异常未被处理，可能导致系统级全局断网 |

## 结语

TUN 模式通过接管系统网络层，提供全局透明代理能力，适用于零信任架构与复杂环境的穿透需求。但其修改全局路由表带来的路由循环风险，以及对操作系统底层 API 的依赖，使其在环境变化时较为脆弱。

以 ProxyBridge 为代表的混合架构方案提供了一条折中路径：它具备类似 TUN 模式的底层强制拦截能力，又保留了基于进程和规则的精准路由机制，避免了全局路由污染。但它在发展过程中仍需克服内核驱动兼容性和内存泄漏等问题。

#### Works cited

[^1]: [TUN/TAP \- Wikipedia](https://en.wikipedia.org/wiki/TUN/TAP), accessed May 14, 2026
[^2]: [Virtual networking 101: bridging the gap to understanding TAP \- The Cloudflare Blog](https://blog.cloudflare.com/virtual-networking-101-understanding-tap/), accessed May 14, 2026
[^3]: [What is network tunneling in computer networks? \- Bunny.net](https://bunny.net/academy/security/what-is-network-tunneling/), accessed May 14, 2026
[^4]: [Linux Kernel Network Packet Processing Explained | Packet Flow \- ThinkPalm](https://thinkpalm.com/blogs/how-linux-kernel-handles-network-packets/), accessed May 14, 2026
[^5]: [The Path of a Packet Through the Linux Kernel \- Chair of Network Architectures and Services](https://www.net.in.tum.de/fileadmin/TUM/NET/NET-2024-04-1/NET-2024-04-1_16.pdf), accessed May 14, 2026
[^6]: [Linux fundamentals: user space, kernel space, and the syscalls API surface \- Form3](https://www.form3.tech/blog/engineering/linux-fundamentals-user-kernel-space), accessed May 14, 2026
[^7]: [Understanding Linux: The User and Kernel Space Explained | by Taha M Kathiria | Medium](https://medium.com/@taha.m.kathiria/understanding-linux-the-user-and-kernel-space-explained-515c180aa6d2), accessed May 14, 2026
[^8]: [Clash Verge TUN Mode: Avoiding the Performance Pitfalls of Layer-3 Tunnels | Bojie Li](https://01.me/en/2025/12/clash-verge-tun-vless/), accessed May 14, 2026
[^9]: [Userspace networking mode (for containers) · Tailscale Docs](https://tailscale.com/docs/concepts/userspace-networking), accessed May 14, 2026
[^10]: [Kernel vs. netstack subnet routing & exit nodes · Tailscale Docs](https://tailscale.com/docs/reference/kernel-vs-userspace-routers), accessed May 14, 2026
[^11]: [User-Space Networking](https://people.cs.rutgers.edu/~sn624/552-F19/lectures/14-userspace-networking.pdf), accessed May 14, 2026
[^12]: [Implementation and Performance Evaluation of TCP over QUIC Tunnels \- arXiv](https://arxiv.org/html/2504.10054v2), accessed May 14, 2026
[^13]: [High context switch rate \- Microsoft Game Development Kit](https://learn.microsoft.com/en-us/gaming/gdk/docs/gdk-dev/console-dev/overviews/threads/high-context-switches?view=gdk-2604), accessed May 14, 2026
[^14]: [Context Switch Overheads for Linux on ARM Platforms \- Semantic Scholar](https://pdfs.semanticscholar.org/ab4d/6fd185780eb83bdecdc9cb0cb71aa96d4af4.pdf), accessed May 14, 2026
[^15]: [Why is it less overhead to switch between threads belonging to the same process than to ... \- Quora](https://www.quora.com/Why-is-it-less-overhead-to-switch-between-threads-belonging-to-the-same-process-than-to-switch-between-threads-belonging-to-different-processes), accessed May 14, 2026
[^16]: [The Context-Switch Overhead Inflicted by Hardware Interrupts (and the Enigma of Do-Nothing Loops) \- USENIX](https://www.usenix.org/events/expcs07/papers/4-tsafrir.pdf), accessed May 14, 2026
[^17]: [Context switch overheads on mobile device platforms \- SciSpace](https://scispace.com/pdf/context-switch-overheads-on-mobile-device-platforms-1yxgw74rhb.pdf), accessed May 14, 2026
[^18]: [Linux Network Performance Ultimate Guide | kiennt26's home](https://ntk148v.github.io/posts/linux-network-performance-ultimate-guide/), accessed May 14, 2026
[^19]: [Linux Performance Tuning \- GitHub Gist](https://gist.github.com/reterVision/faab6c00fb04d09334e9), accessed May 14, 2026
[^20]: [GitHub \- tsuna/contextswitch: Little micro-benchmark for Linux to test the cost of context switching and system calls](https://github.com/tsuna/contextswitch), accessed May 14, 2026
[^21]: [Using raw sockets and kernel bypassing to improve performance · Issue #188 · gsliepen/tinc](https://github.com/gsliepen/tinc/issues/188), accessed May 14, 2026
[^22]: [Chapter 33. Tuning the network performance | Monitoring and managing system status and performance | Red Hat Enterprise Linux](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance), accessed May 14, 2026
[^23]: [[BUG] TUN mode ignores route-exclude-address and loops self proxy connections · Issue #2618 · MetaCubeX/mihomo \- GitHub](https://github.com/MetaCubeX/mihomo/issues/2618), accessed May 14, 2026
[^24]: [How to Use SO_MARK Socket Option in Envoy for IPv4 Transparent Proxying \- OneUptime](https://oneuptime.com/blog/post/2026-03-20-envoy-so-mark-ipv4-transparent-proxy/view), accessed May 14, 2026
[^25]: [fwmark routing policy with netplan \- Ask Ubuntu](https://askubuntu.com/questions/1029293/fwmark-routing-policy-with-netplan), accessed May 14, 2026
[^26]: [Short explanation Fake-ip and Redir-host in OpenClash running mode | REYRE-STB](https://www.youtube.com/watch?v=tn_HjIHbfyw), accessed May 14, 2026
[^27]: [Benefits of Remote NDIS \- Windows drivers \- Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/benefits-of-remote-ndis), accessed May 14, 2026
[^28]: [NDIS Network Interface Architecture \- Windows drivers | Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/ndis-network-interface-architecture), accessed May 14, 2026
[^29]: [NDIS Intermediate Driver or WFP? \- NTDEV \- OSR Developer Community](https://community.osr.com/t/ndis-intermediate-driver-or-wfp/45128), accessed May 14, 2026
[^30]: [The compatibility issue between NDIS version and Windows version \- Stack Overflow](https://stackoverflow.com/questions/17037907/the-compatibility-issue-between-ndis-version-and-windows-version), accessed May 14, 2026
[^31]: [Performance Degradation and Denial of Service Attacks in NDIS Drivers \- Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/drivers/network/performance-degradation-and-denial-of-service-attacks-in-ndis-drivers), accessed May 14, 2026
[^32]: [WireGuard/wintun: Mirror only. Official repository is at https://git.zx2c4.com/wintun · GitHub \- GitHub](https://github.com/WireGuard/wintun), accessed May 14, 2026
[^33]: [GitHub \- despair86/wintun-ndis5: Wireguard wintun driver for NDIS 5.x](https://github.com/despair86/wintun-ndis5), accessed May 14, 2026
[^34]: [Wintun – Layer 3 TUN Driver for Windows](https://www.wintun.net/), accessed May 14, 2026
[^35]: [Windows Packet Filter \- NT KERNEL](https://www.ntkernel.com/windows-packet-filter/), accessed May 14, 2026
[^36]: [any benchmarks against Wireguard? · Issue #382 · cloudflare/boringtun \- GitHub](https://github.com/cloudflare/boringtun/issues/382), accessed May 14, 2026
[^37]: [Network extension framework versus kernel extension \- Stack Overflow](https://stackoverflow.com/questions/59760901/network-extension-framework-versus-kernel-extension), accessed May 14, 2026
[^38]: [macOS System Extension & Kernel Development](https://joyasystems.com/macos-development), accessed May 14, 2026
[^39]: [What macOS Kernel Extensions Are and How Apple Is Evolving Them \- NinjaOne](https://www.ninjaone.com/blog/what-macos-kernel-extensions-are/), accessed May 14, 2026
[^40]: [System Extensions \- Overview and Guide \- Kandji Support](https://support.kandji.io/kb/system-extensions-overview-and-guide), accessed May 14, 2026
[^41]: [System extensions in macOS \- Apple Support](https://support.apple.com/guide/deployment/system-extensions-in-macos-depa5fb8376f/web), accessed May 14, 2026
[^42]: [System extensions are replacing macOS kernel extensions. How will this affect you? \- ManageEngine Blog](https://www.manageengine.com/mobile-device-management/blog/system-extensions-are-replacing-macos-kernel-extensions-how-will-this-affect-you.html), accessed May 14, 2026
[^43]: [macOS Sequoia network issues \- Apple Support Community](https://discussions.apple.com/thread/255765230), accessed May 14, 2026
[^44]: [macOS 15 Sequoia Firewall and Network Connectivity Issues \- Edovia Support](https://support.edovia.com/en/screens-5/troubleshooting/conn-issues-sequoia), accessed May 14, 2026
[^45]: [Networking issues fix guide \- MacOS Sequoia 15.x & CrossOver 25.x \- Reddit](https://www.reddit.com/r/Codeweavers_Crossover/comments/1lalmrm/networking_issues_fix_guide_macos_sequoia_15x/), accessed May 14, 2026
[^46]: [Apple's built-in macOS firewall breaks third-party firewalls \- Objective Development Blog](https://obdev.at/blog/apples-built-in-macos-firewall-breaks-third-party-firewalls/), accessed May 14, 2026
[^47]: [What's new for enterprise in macOS Sequoia \- Apple Support (JO)](https://support.apple.com/en-jo/121011), accessed May 14, 2026
[^48]: [macOS 15 Sequoia firewall breaks network connection \- Synergy Help Center \- Symless](https://help.symless.com/hc/en-us/articles/35715295144593-macOS-15-Sequoia-firewall-breaks-network-connection), accessed May 14, 2026
[^49]: [[BUG] V2.2.0 and V2.2.1 TUN is broken in macOS · Issue #3114 · clash-verge-rev/clash-verge-rev \- GitHub](https://github.com/clash-verge-rev/clash-verge-rev/issues/3114), accessed May 14, 2026
[^50]: [Pentesting Lab \- Privilege Escalation \- Windows \- ISEC](https://www.isec.tugraz.at/wp-content/uploads/2024/09/03-privilege-escalation-windows-handout.pdf), accessed May 14, 2026
[^51]: [Clash Verge "TUN Mode" not working on Fedora Hyprland – install service fails with status 127 \- Reddit](https://www.reddit.com/r/Fedora/comments/1ou7ybd/clash_verge_tun_mode_not_working_on_fedora/), accessed May 14, 2026
[^52]: [SOCKS Proxies \- Pydoll \- Async Web Automation Library](https://pydoll.tech/docs/deep-dive/network/socks-proxies/), accessed May 14, 2026
[^53]: [SOCKS5 Proxy vs. HTTP Proxy: The Definitive Guide for Beginner | by Data for AI | Medium](https://medium.com/@dataforAI/socks5-proxy-vs-http-proxy-the-definitive-guide-for-beginner-d0cb2ffc3545), accessed May 14, 2026
[^54]: [Socks5 Proxies vs. HTTP Proxies: How to Choose? \- Stackademic](https://stackademic.com/blog/socks5-proxies-vs-http-proxies-how-to-choose), accessed May 14, 2026
[^55]: [SOCKS5 proxy provider : r/devops \- Reddit](https://www.reddit.com/r/devops/comments/oqll1a/socks5_proxy_provider/), accessed May 14, 2026
[^56]: [SOCKS5 vs HTTP Proxy: Differences and Which One to Use? \- Webshare](https://www.webshare.io/blog/socks5-vs-http-proxy), accessed May 14, 2026
[^57]: [Proxy Auto-Configuration (PAC) file \- HTTP \- MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file), accessed May 14, 2026
[^58]: [Proxy auto-config \- Wikipedia](https://en.wikipedia.org/wiki/Proxy_auto-config), accessed May 14, 2026
[^59]: [How the Windows Update client determines which proxy server to use \- Microsoft Learn](https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/windows-update-client-determines-proxy-server-connect), accessed May 14, 2026
[^60]: [System proxy management \- Black Duck Documentation Portal](https://documentation.blackduck.com/bundle/codesight_latest-2025.2.0/page/topics/preferences/r_code_sight_system_proxy_management.html), accessed May 14, 2026
[^61]: [windows \- System Proxy Settings Being Ignored by Apps \- Stack Overflow](https://stackoverflow.com/questions/33862969/system-proxy-settings-being-ignored-by-apps), accessed May 14, 2026





