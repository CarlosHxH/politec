FROM nginx:alpine

# Remove a configuração padrão
RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copia nossa configuração
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]