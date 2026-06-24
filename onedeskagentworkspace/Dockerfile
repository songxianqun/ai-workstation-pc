# ========== 构建阶段 ==========
FROM node:18-alpine AS build

WORKDIR /src

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制全部源码
COPY . .

# 执行静态资源构建（输出到 build/）
RUN node scripts/build-static.js

# ========== 运行阶段 ==========
FROM node:18-alpine

WORKDIR /app

# 复制依赖
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/package.json ./

# 复制服务端文件
COPY --from=build /src/proxy-server.js ./
COPY --from=build /src/ib-business-assistant ./ib-business-assistant

# 复制静态资源（build/ 目录输出物）
COPY --from=build /src/build ./build

# 复制原始静态文件（index.html、styles.css 等直接在根目录提供）
COPY --from=build /src/index.html ./
COPY --from=build /src/styles.css ./
COPY --from=build /src/images ./images
COPY --from=build /src/mobile.html ./
COPY --from=build /src/mobile.css ./

EXPOSE 3000

CMD ["node", "proxy-server.js"]
