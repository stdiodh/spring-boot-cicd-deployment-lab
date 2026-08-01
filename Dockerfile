FROM eclipse-temurin:21-jre

WORKDIR /app

ARG APP_VERSION=local
ARG APP_RELEASE=local
LABEL org.opencontainers.image.revision="${APP_VERSION}"
LABEL org.opencontainers.image.version="${APP_RELEASE}"

COPY build/libs/app.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
