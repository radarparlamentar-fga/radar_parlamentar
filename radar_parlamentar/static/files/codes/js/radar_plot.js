/*##############################################################################
#       Copyright (C) 2013  Diego Rabatone Oliveira, Leonardo Leite,           #
#                           Saulo Trento                                       #
#                                                                              #
#    This program is free software: you can redistribute it and/or modify      #
# it under the terms of the GNU Affero General Public License as published by  #
#      the Free Software Foundation, either version 3 of the License, or       #
#                     (at your option) any later version.                      #
#                                                                              #
#       This program is distributed in the hope that it will be useful,        #
#       but WITHOUT ANY WARRANTY; without even the implied warranty of         #
#        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         #
#             GNU Affero General Public License for more details.              #
#                                                                              #
#  You should have received a copy of the GNU Affero General Public License    #
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.     #
##############################################################################*/

// Versão para o hackathon cdep 2013

Plot = (function ($) {

    // Function to load the data and draw the chart
    function initialize(nome_curto_casa_legislativa) {
        d3.json("/analises/json_analise/" + nome_curto_casa_legislativa, plot_data);
        //para testes com arquivo hardcoded
//        d3.json("/static/files/partidos.json", plot_data);
//        d3.json("/static/files/cdep.json", plot_data);
    }

    function space_to_underline(name) {
        return name.replace(/\s+/g,'_');
    }
    
    function cor(d) { return d.cor; }    
    function nome(d) { return space_to_underline(d.nome); } 
    function numero(d) { return d.numero; } 
    
    // Creates a "radialGradient"* for each circle
    // and returns the id of the just created gradient.
    // * the "radialGradient" is a SVG element
    function gradiente(svg,id,color) {
        DEFAULT_COLOR = "#1F77B4";
        if (color === "#000000") color = DEFAULT_COLOR;
        pct_white = 70;
        center_color = shadeColor(color,pct_white); 
        var identificador = "gradient-" + id;
        var gradient = svg.append("svg:defs")
            .append("svg:radialGradient")
            .attr("id", identificador)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");
        
        gradient.append("svg:stop")
            .attr("offset", "0%")
            .attr("stop-color", center_color)
            .attr("stop-opacity", 1);
        
        gradient.append("svg:stop")
            .attr("offset", "70%")
            .attr("stop-color", color)
            .attr("stop-opacity", 1);
        return "url(#" + identificador + ")";
    }
    
    // Add white to the color. from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
    function shadeColor(color, percent) {

        var R = parseInt(color.substring(1,3),16);
        var G = parseInt(color.substring(3,5),16);
        var B = parseInt(color.substring(5,7),16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = (R<255)?R:255;  
        G = (G<255)?G:255;  
        B = (B<255)?B:255;  

        var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

        return "#"+RR+GG+BB;
    }

    // Chart dimensions.
    var margin = {top: 20, right: 20, bottom: 20, left: 20},
        width_graph = 670,
        height_graph = 670,
        width = width_graph - margin.right - margin.left,
        height = height_graph - margin.top - margin.bottom,
        space_between_graph_and_control = 60,
        height_of_control = 80;
    var TEMPO_ANIMACAO = 1500,
        RAIO_PARLAMENTAR = 6;

    // Variables related to the background of concentrical circles
    var radius = 10;
    var dist_between_radiusses = 40;
    var full_radius = Math.min(width,height)/2;
    var bg_radius_array = [radius];
    var bg_radius_index = [0];
    var i = 1;
    radius = radius + dist_between_radiusses;
    while (radius < full_radius) {
//        fundo.append("circle")
//            .attr("class", "background_radius")
//            .attr("r",radius);
        bg_radius_array.push(radius);
        bg_radius_index.push(i++);
        radius = radius + dist_between_radiusses;
    }

    // Scales
    var xScale = d3.scale.linear().range([0, width]), // scale for members
        yScale = d3.scale.linear().range([height, 0]),
        xScalePart = d3.scale.linear().range([0, width]), // scale for parties
        yScalePart = d3.scale.linear().range([height, 0]);

    var periodo_min,
        periodo_max,
        periodo_de,
        periodo_para,
        periodo_atual,
        partidos,
        periodos,
        partidos_explodidos = [];

    // Function that draws the chart
    function plot_data(dados) {
        // Inicialmente remove o spinner de loading
        $("#loading").remove();

        r = dados.max_raio
        r_partidos = dados.max_raio_partidos
        xScale.domain([-r, r])
        yScale.domain([-r, r])
//        xScalePart.domain([-r_partidos, r_partidos])
//        yScalePart.domain([-r_partidos, r_partidos])
        xScalePart.domain([-r, r])
        yScalePart.domain([-r, r])
        
        // Creates the SVG container and sets the origin.
        var svg_base = d3.select("#animacao").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + space_between_graph_and_control)
            .style("position", "relative");

        var grupo_controle_periodos = svg_base.append("g")
            .attr("width", width)
            .attr("height", height_of_control)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        grupo_grafico = svg_base.append("g")
            .attr("id", "grupo_grafico")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("transform", "translate(" + margin.left + "," + (margin.top + space_between_graph_and_control ) + ")");

        var bg_group = grupo_grafico.append("g")
            .attr("transform","translate(" + width/2 + "," + height/2 + ")")
            .attr("id","bg_group");

        legend = d3.selectAll('.legend');

        createBackground(full_radius);
        transitionBackground("linear");

        var label_periodo = grupo_controle_periodos.append("text")
            .attr("class", "year label")
            .attr("text-anchor", "middle")
            .attr("y", 30 )
            .attr("x", width/2);

        var label_nvotacoes = grupo_controle_periodos.append("text")
            .attr("class", "total_label")
            .attr("text-anchor", "middle")
            .attr("y", "48")
            .attr("x", width/2);

        var go_to_previous = grupo_controle_periodos.append("image")
            .attr("xlink:href", "/static/assets/arrow_left.svg")
            .attr("id", "previous_period")
            .attr("class", "previous")
            .attr("y", 0)
            .attr("x", 10)
            .attr("width", 113)
            .attr("height", 113);
            
        var go_to_next = grupo_controle_periodos.append("image")
            .attr("xlink:href", "/static/assets/arrow_right.svg")
            .attr("id", "next_period")
            .attr("class", "next")
            .attr("y", 0)
            .attr("x", width-113-10)
            .attr("width", 113)
            .attr("height", 113);
        
        // setando variáveis já declaradas
        partidos = dados.partidos;
        periodos = dados.periodos;
        periodo_min = 0;
        periodo_max = periodos.length-1;
        periodo_atual = periodo_min;
        periodo_para = periodo_atual;
        periodo_de = periodo_atual;        

        configure_go_to_next();
        configure_go_to_previous();

        change_period();

        var escala_quadratica = false;

        var alternador_escalas = grupo_controle_periodos.append("text")
            .attr("id", "alterna_escalas")
            .attr("class", "alterna_escala")
            .attr("text-anchor", "middle")
            .attr("y", 130)
            .attr("x", width-40 )
            .text("Zoom In")
            .on("click", alternar_escalas);

        function alternar_escalas() {
            if (escala_quadratica==false) {
                xScale = d3.scale.sqrt();
                yScale = d3.scale.sqrt();
                xScalePart = d3.scale.sqrt();
                yScalePart = d3.scale.sqrt();
                escala_quadratica = true;
                alternador_escalas.text("Zoom Out");
                transitionBackground("quadratic");
            }
            else {
                xScale = d3.scale.linear();
                yScale = d3.scale.linear();
                xScalePart = d3.scale.linear();
                yScalePart = d3.scale.linear();
                escala_quadratica = false;
                alternador_escalas.text("Zoom In");
                transitionBackground("linear");
            }
            xScale.range([0, width]).domain([-r, r]); // scale for members
            yScale.range([height, 0]).domain([-r, r]);
            xScalePart.range([0, width]).domain([-r, r]); // scale for parties
            yScalePart.range([height, 0]).domain([-r, r]);
            atualiza_grafico(true);
        }



        // ############## Funções de controle de mudanças de estado ###########
        
        // Função que controla mudança de estado para o estado seguinte
        function configure_go_to_next() {
            go_to_next
                .on("mouseover", mouseover_next)
                .on("mouseout", mouseout_next)
                .on("click", change_to_next_period);
        }

        // Função que controla a mudança de estado para o estado anterior
        function configure_go_to_previous() {
            go_to_previous
                .on("mouseover", mouseover_previous)
                .on("mouseout", mouseout_previous)
                .on("click", change_to_previous_period);
        }
        
        function change_to_next_period() {
            periodo_de = periodo_atual;
            periodo_para = periodo_atual + 1;
            if (periodo_para > periodo_max)
                periodo_para = periodo_max;
            periodo_atual = periodo_para;
            change_period();
        }

        function change_to_previous_period() {
            periodo_de = periodo_atual;
            periodo_para = periodo_atual - 1;
            if (periodo_para < periodo_min)
                periodo_para = periodo_min;
            periodo_atual = periodo_para;
            change_period();
        }
        
        function change_period() {
            atualiza_grafico(false);
        }

        // atualiza partidos e deputados no gráfico de acordo com o período atual
        // explodindo: true quando estamos atualizando o gráfico por causa de uma explosão de partido
        // (explosão de partido é quando se clica no partido para ver seus parlamentares)
        function atualiza_grafico(explodindo) {
            // Legend
            var partidos_legenda = get_partidos_no_periodo(periodo_atual);

            var legend_items = legend.selectAll('.legend_item')
                .data(partidos_legenda, function(d) {return d.nome});
            legend_items.transition()
                .text(function(d) {return d.numero + " | " + d.nome + " (" + d.t[periodo_atual] + ")"})
                .duration(TEMPO_ANIMACAO);
            var new_legend_items = legend_items.enter().append("li")
                .attr("class","legend_item")
                .text(function(d) {return d.numero + " | " + d.nome + " (" + d.t[periodo_atual] + ")"})
                .on("mouseover", function(d) { d3.selectAll("#circle-"+nome(d)).classed("hover",true); d3.selectAll('.partido_' + nome(d)).attr("class",["parlamentar_circle_hover partido_" + nome(d)] ); })
                .on("mouseout", function(d) { d3.selectAll("#circle-"+nome(d)).classed("hover",false); d3.selectAll('.partido_' + nome(d)).attr("class",["parlamentar_circle partido_" + nome(d)] ); });
            legend_items.exit().remove();

            // Circles that represent the parties
            partidos_no_periodo = get_partidos_nao_explodidos_no_periodo(periodo_atual);

            var parties = grupo_grafico.selectAll('.party').data(partidos_no_periodo, function(d) { return d.nome });
            var circles = grupo_grafico.selectAll('.party_circle').data(partidos_no_periodo, function(d) { return d.nome });

            parties.transition()
                .attr("transform", function(d) { return "translate(" + xScalePart(d.x[periodo_para]) +"," +  yScalePart(d.y[periodo_para]) + ")" })
                .duration(TEMPO_ANIMACAO);
            
            parties.selectAll(".party_circle").transition()
                .attr("r", function(d) { return d.r[periodo_para]})
                .duration(TEMPO_ANIMACAO);

            var new_parties = parties.enter().append("g")
                .attr("class","party")
                .attr("id",function(d){return "group-"+nome(d);})
                .attr("transform", function(d) { return "translate(" + xScalePart(d.x[periodo_atual]) +"," +  yScalePart(d.y[periodo_atual]) + ")";})
                .attr("opacity",0.00001)
                .on("click", function(d) { return explode_partido(d); });
            
            new_parties.append("title")
                .text(function(d) { return nome(d); });
    
            var new_circles = new_parties.append("circle")
                .attr("class","party_circle")
                .attr("id", function(d) { return "circle-" + nome(d); })
                .attr("r", 0)
                .attr("fill", function(d) {return gradiente(grupo_grafico, nome(d), cor(d)); });

            new_parties.append("text")
                .attr("text-anchor","middle")
                .attr("dy",3)
                .text(function(d) { return d.nome; });

            new_parties.transition()
                .attr("opacity",1)
                .duration(TEMPO_ANIMACAO);

            new_circles.transition().duration(TEMPO_ANIMACAO)
                .attr("r", function(d) { return d.r[periodo_atual]; });
            
            circles.exit().transition().duration(TEMPO_ANIMACAO).attr("r",0).remove();
            var parties_vao_sair = parties.exit().transition().duration(TEMPO_ANIMACAO);
            parties_vao_sair.remove();

            // Parlamentares (represented by dots), treating one party at a time in this loop:
            partidos_legenda.forEach(function(partido) {
                if (jQuery.inArray(partido,partidos_explodidos) == -1)
                    var parlamentares_no_periodo = []; // não é para ter dados de parlamentares se o partido não estiver explodido.
                else
                    var parlamentares_no_periodo = get_parlamentares_no_periodo(partido, periodo_atual);

                // DATA-JOIN dos parlamentares deste partido:
                var parlamentares = grupo_grafico.selectAll('.parlamentar_circle.partido_' + nome(partido))
                    .data(parlamentares_no_periodo, function(d) { return d.id });

                parlamentares.transition()
                             .duration(TEMPO_ANIMACAO)
                             .attr("cx", function(d) { return xScale(d.x[periodo_para]); })
                             .attr("cy", function(d) { return yScale(d.y[periodo_para]); });

                var new_parlamentares = parlamentares.enter().append("circle")
                    .attr("class",["parlamentar_circle partido_" + nome(partido)] )
                    .attr("id", function(d) { return "point-" + nome(d); })
                    .attr("r", RAIO_PARLAMENTAR)
                    .attr("fill", cor(partido))
                    .on("click", function(d) { return implode_partido(partido); });

                new_parlamentares.append("title").text(function(d) { return d.nome + ' - ' + partido.nome; });
                    
                if (explodindo) {
                    new_parlamentares.attr("cx", xScale(partido.x[periodo_atual]))
                                     .attr("cy", yScale(partido.y[periodo_atual]))
                                     .transition().duration(TEMPO_ANIMACAO)
                                                  .attr("cx", function(d) { return xScale(d.x[periodo_atual]); })
                                                  .attr("cy", function(d) { return yScale(d.y[periodo_atual]); });

                    parlamentares.exit()
                        .attr("cx", function(d) { return xScale(d.x[periodo_atual]); })
                        .attr("cy", function(d) { return yScale(d.y[periodo_atual]); })
                        .transition().duration(TEMPO_ANIMACAO)
                                     .attr("cx", xScale(partido.x[periodo_atual]))
                                     .attr("cy", yScale(partido.y[periodo_atual]))
                        .remove();
                } else {
                    new_parlamentares.attr("cx", function (d) { return xScale(d.x[periodo_para]); })
                                     .attr("cy", function (d) { return yScale(d.y[periodo_para]); })
                                     .attr("r",0);
                    new_parlamentares.transition()
                                     .duration(TEMPO_ANIMACAO)
                                     .attr("r", RAIO_PARLAMENTAR);

                    parlamentares.exit().transition().duration(TEMPO_ANIMACAO).attr("r",0).remove();
                }
            });            
            
            label_periodo.text(periodos[periodo_atual].nome);
            quantidade_votacoes = periodos[periodo_atual].nvotacoes;
            label_nvotacoes.text(quantidade_votacoes + " votações"); 
            
            sortAll();
            
            if (periodo_para == periodo_max) go_to_next.classed("active", false);
            if (periodo_para == periodo_min) go_to_previous.classed("active", false);
        }

        function mouseover_next() {
            if (periodo_atual < periodo_max) go_to_next.classed("active", true);
        }

        function mouseout_next() {
            go_to_next.classed("active", false);
        }

        function mouseover_previous() {
            if (periodo_atual > periodo_min) go_to_previous.classed("active", true);
        }

        function mouseout_previous() {
            go_to_previous.classed("active", false);
        }
        
        function sortAll() {
            var circunferencias = grupo_grafico.selectAll(".party, .parlamentar_circle");
            circunferencias.sort(order);
            var legend_entries = legend.selectAll(".legend_item");
            legend_entries.sort(order);
        }

        function explode_partido(partido) { //partido é o json do partido
            partidos_explodidos.push(partido);
            atualiza_grafico(true);
        }
        
        function implode_partido(partido) { //partido é o json do partido
            remove_from_array(partidos_explodidos,partido);
            atualiza_grafico(true);
        }

        // remove o elemento de valor el da array lista, e retorna a lista modificada
        function remove_from_array(lista,el) {
            for(var i = lista.length - 1; i >= 0; i--) {
                if(lista[i] === el) {
                    lista.splice(i, 1);
                }
            }
            return lista;
        }

        // Defines a sort order so that the smallest parties are drawn on top.
        function order(a, b) {
            if (a == null || b == null) console.log(parties, a, b);
            if (is_parlamentar(a))
                return 1
            if (is_parlamentar(b))
                return -1
            return b.t[periodo_atual] - a.t[periodo_atual];
        }
        
        function is_parlamentar(d) {
            // bem hacker ^^
            return (typeof d.cor === "undefined")
        }

        // Retorna partidos excluindo partidos ausentes no período
        function get_partidos_no_periodo(period) {
            return partidos.filter(function(d){ return d.t[period] > 0;});
        }

        // Retorna partidos excluindo partidos ausentes no período e partidos explodidos
        function get_partidos_nao_explodidos_no_periodo(period) {
            return partidos.filter(function(d){ return d.t[period] > 0 && jQuery.inArray(d,partidos_explodidos) == -1;});
        }
        
        // Retorna o json de parlamentares do partido, do qual foram excluídos parlamentares ausentes no dado period.
        function get_parlamentares_no_periodo(partido, period) {
            return partido.parlamentares.filter(function (d) {return d.x[periodo_atual] !== null; })
        }
    }

    function createBackground(full_radius) {
        background = grupo_grafico.append("g")
            .attr("transform","translate(" + width/2 + "," + height/2 + ")")
            .attr("id","background");
        background.append("circle")
            .attr("class","outer_background_radius")
            .attr("r",full_radius);
    }

    function transitionBackground(type_of_scale) {
        // type_of_scale should be a string, either "linear" or "quadratic"                
        var local_radius_array = bg_radius_array; // fallback to linear scale.
        if (type_of_scale == "linear") {
            var local_radius_array = bg_radius_array;
        }
        else if (type_of_scale == "quadratic") {
            var local_radius_array = bg_radius_array.map(function(d) {return Math.sqrt(d/full_radius)*full_radius });
        }
        // DATA-JOIN
        var bg_circles = background.selectAll('.background_radius').data(bg_radius_index);

        // TRANSITION
        bg_circles.transition()
            .duration(TEMPO_ANIMACAO)
            .attr("r", function(d) { return local_radius_array[d]});

        // ENTER
        var new_circles = bg_circles.enter().append("circle")
            .attr("class","background_radius")
            .attr("r", function(d) { return local_radius_array[d]});
    }

    return {
        initialize:initialize
    };
})(jQuery);
