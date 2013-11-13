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

Plot = (function ($) {

    // Function to load the data and draw the chart
    function initialize(nome_curto_casa_legislativa, periodicidade) {
    d3.json("/analises/analise/" + nome_curto_casa_legislativa + "/" + periodicidade + "/json_pca", _plot_data);
        //para testes com arquivo hardcoded
        //d3.json("/static/files/partidos.json", _plot_data);
    }

    function space_to_underline(name) {
      return name.replace(/\s+/g,'_');
    }
    
    function x(d) { return d.x; } 
    function y(d) { return d.y; } 
    function tamanho(d) { return 1; } // era d.tamanho; // tamanho da bancada
    function raio(d) { return d.r; }
    function presenca(d) { return d.p; }
    function cor(d) { return d.cor; } 
    function nome(d) { return space_to_underline(d.nome); } 
    function numero(d) { return d.numero; } 

    // Creates a "radialGradient"* for each circle
    // and returns the id of the just created gradient.
    // * the "Gradient Fill" is a SVG element
    function gradiente(svg,id,color) {
        DEFAULT_COLOR = "#1F77B4";
        if (color === "#000000") color = DEFAULT_COLOR;
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
            .attr("stop-color", color)
            .attr("stop-opacity", 0.5);

        gradient.append("svg:stop")
            .attr("offset", "70%")
            .attr("stop-color", color)
            .attr("stop-opacity", 1);
        return "url(#" + identificador + ")";
    }

    // Chart dimensions.
    var margin = {top: 20, right: 20, bottom: 20, left: 20},
        width_graph = 670,
        height_graph = 670,
        width = width_graph - margin.right - margin.left,
        height = height_graph - margin.top - margin.bottom,
        space_between_graph_and_control = 60,
        height_of_control = 80;

    // Various scales. These domains make assumptions of data, naturally.
    var xScale = d3.scale.linear().domain([0, 100]).range([0, width]),
        yScale = d3.scale.linear().domain([0, 100]).range([height, 0]),
        radiusScale = d3.scale.linear().domain([0, 1]).range([0, 20]);

    var periodo_min = null,
        periodo_max = null,
        periodo_de = 1,
        periodo_para = null,
        periodo_atual = 1,
        partidos = null,
        periodos = null;

    // Function that draws the chart
    function _plot_data(dados) {
        // Inicialmente remove o spinner de loading
        $("#loading").remove();

        // Creates the SVG container and sets the origin.
        var svg_base = d3.select("#animacao").append("svg")
            .attr("width", width + margin.left + margin.right + 200)
            .attr("height", height + margin.top + margin.bottom + space_between_graph_and_control)
            .style("position", "relative");

        var grupo_controle_periodos = svg_base.append("g")
	    .attr("width", width)
	    .attr("height", height_of_control)
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//            .attr("transform", "translate(" + (width + margin.left + 100) + "," + (margin.top + 34) + ")");

        var grupo_grafico = svg_base.append("g")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("transform", "translate(" + margin.left + "," + (margin.top + space_between_graph_and_control ) + ")");

        //Adicionando o fundo do radar
        var fundo = grupo_grafico.append("g")
            .attr("transform","translate(" + width/2 + "," + height/2 + ")");

        raio_fundo = Math.min(width,height)/2;

        fundo.append("circle")
            .attr("class", "radar_background")
            .attr("r", raio_fundo);

        raio = 10;
        while (raio < raio_fundo) {
            fundo.append("circle")
                .attr("class", "raio_radar")
                .attr("r",raio);
            raio = raio + 40;
        }

        partidos = dados.partidos;
        periodos = dados.periodos;

        //Carregando os períodos extremos dos dados
        var chaves_periodos = d3.keys(periodos),
            lista_periodos = [];

        for (item in chaves_periodos) { lista_periodos.push( parseInt( chaves_periodos[item] ) ); };

        periodo_min_max = d3.extent(lista_periodos);
        periodo_min = periodo_min_max[0]
        periodo_max = periodo_min_max[1]

        nome_periodo = periodos[periodo_min].nome;
        quantidade_votacoes_do_periodo = periodos[periodo_min].quantidade_votacoes;

        // Add period label
        var label = grupo_controle_periodos.append("text")
            .attr("class", "year label")
            .attr("text-anchor", "middle")
            .attr("y", 30 )
            .attr("x", width/2)
            .text(nome_periodo);

        var total_label = grupo_controle_periodos.append("text")
            .attr("class", "total_label")
            .attr("text-anchor", "middle")
            .attr("y", "48")
            .attr("x", width/2);
//            .text("Votações analisadas no período: " + quantidade_votacoes_do_periodo + " votações");

        // Add an overlay for the year label.
        var l_box = label.node().getBBox();

        var previous_period = grupo_controle_periodos.append("text")
            .attr("id", "previous_period")
            .attr("class", "previous")
            .attr("text-anchor", "middle")
            .attr("y", 20)
            .attr("x", 10)
            .text("<");

        var next_period = grupo_controle_periodos.append("text")
            .attr("id", "next_period")
            .attr("class", "next")
            .attr("text-anchor", "middle")
            .attr("y", 20)
            .attr("x", width-10 )
            .text(">");
        
        // adicionando controladores de movimentação de período 
        interactPrevious();
        interactNext();

        // A bisector since many nation's data is sparsely-defined.
        var bisect = d3.bisector(function(d) { return d[0]; });

        // Add a partie. Initialize the date at 1800, and set the colors.
        var main = grupo_grafico.append("g")
            .attr("id","parties")

        var dados = interpolateData(1)
            .filter(function(d){ return tamanho(d);});

        var parties = main.selectAll(".partie")
            .data(dados)
        .enter().append("g")
            .attr("class","partie")
            .attr("id", function(d){return "group-"+nome(d);})
            .attr("transform", function(d) { return "translate(" + xScale(x(d)) +"," +  yScale(y(d)) + ")";});

        parties.append("circle")
            .attr("class", "partie_circle")
            .attr("id", function(d) { return "circle-" + nome(d); })
            .attr("r", function(d) { return radiusScale(tamanho(d)); }) // TODO trocar pra raio(d)
            .style("fill", function(d) { return gradiente(grupo_grafico, nome(d), cor(d)); });

        // Add a title.
        parties.append("title")
            .text(function(d) { return nome(d); });

        parties.append("text")
            .attr("dx", "-8")
            .attr("dy", "3")
            .text(function(d){ return numero(d);});

        parties.sort(order);

        // Primeira animação
        startFirst();

        // Defines a sort order so that the smallest parties are drawn on top.
        function order(a, b) {
            if (a == null || b == null) console.log(parties, a, b);
            return tamanho(b) - tamanho(a);
        }

        // Primeira animação automática
        function startFirst() {
            // Seta períodos inicial e final de interpolação como
            //      período mínimo e máximo, respectivamente.
            periodo_de = periodo_min;
            periodo_para = periodo_max;

            // Começa a transição inicial ao entrar na página
            grupo_grafico.transition()
                .duration(10000)
                .ease("linear")
                .tween("year", tweenYear)
                .each("end", sortAll);
        }

        // ############## Funções de controle de mudanças de estado ###########
        
        // Função que controla mudança de estado para o estado seguinte
        function interactNext() {
            next_period
                .on("mouseover", mouseover_next)
                .on("mouseout", mouseout_next)
                .on("click", move_next_period);

            // Cancel the current transition, if any.
            grupo_grafico.transition().duration(0);
            
            // Função que gera o movimento para o próximo período
            function move_next_period() {
                if (periodo_atual < periodo_max) {
                    periodo_de = periodo_atual;
                    periodo_para = Math.floor(periodo_atual + 1);
                    if (periodo_para > periodo_max){
                        periodo_para = periodo_max
                    }
                    tweenYear();
                    grupo_grafico.transition()
                        .duration(1000)
                        .ease("linear")
                        .tween("year", tweenYear)
                        .each("end", sortAll);

                    if (periodo_para == periodo_max) next_period.classed("active", false);
                }
            }

            // Função que controla o mouse over, indicando que o elemento está ativo
            function mouseover_next() {
                if (periodo_atual < periodo_max) next_period.classed("active", true);
            }

            // Função que controla o mouse out, indicando que o elemento não está mais ativo
            function mouseout_next() {
                if (periodo_atual < periodo_max) next_period.classed("active", false);
            }
        }

        // Função que controla a mudança de estado para o estado anterior
        function interactPrevious() {
            previous_period
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
                .on("click", move_previous);

            // Cancel the current transition, if any.
            grupo_grafico.transition().duration(0);

            function move_previous() {
                if (periodo_atual > periodo_min) {
                    periodo_de = periodo_atual;
                    periodo_para = Math.floor(periodo_atual - 1);
                    tweenYear();
                    grupo_grafico.transition()
                        .duration(1000)
                        .ease("linear")
                        .tween("year", tweenYear)
                        .each("end", sortAll);

                    if (periodo_para == periodo_min) previous_period.classed("active", false);
                }
            }

            function mouseover() {
                if (periodo_atual > periodo_min) previous_period.classed("active", true);
            }

            function mouseout() {
                if (periodo_atual > periodo_min) previous_period.classed("active", false);
            }
        }
        
        function sortAll() {
            var partidos = grupo_grafico.selectAll(".partie")
            partidos.sort(order);
        }

        // Tween == interpolar
        // Tweens the entire chart by first tweening the year, and then the data.
        // For the interpolated data, the parties and label are redrawn.
        function tweenYear() {
            var year = d3.interpolateNumber(periodo_de, periodo_para);
            return function(t) { displayPeriod(year(t)); };
        }

        // Updates the display to show the specified period.
        function displayPeriod(period) {
            periodo_atual = period;
            
            var dados = interpolateData(period)
                .filter(function(d){ return tamanho(d);});

            var main = grupo_grafico.select("#parties");

            var parties = main.selectAll(".partie")
                .data(dados)
                .attr("transform", function(d) { return "translate(" + xScale(x(d)) +"," +  yScale(y(d)) + ")";});

            var partie = parties.enter()
                .append("g")
                .attr("class","partie")
                .attr("id", function(d){return "group-"+nome(d);})
                .attr("transform", function(d) { return "translate(" + xScale(x(d)) +"," +  yScale(y(d)) + ")";});
              
            partie.append("circle")
                .attr("class", "partie_circle")
                .attr("id", function(d) { return "circle-" + nome(d); })
                .attr("r", function(d) { return radiusScale(tamanho(d)); })
                .style("fill", function(d) { return gradiente(grupo_grafico, nome(d), cor(d)); });

            // Add a title.
            partie.append("title")
                .text(function(d) { return nome(d); });

            partie.append("text")
                .attr("dx", "-8")
                .attr("dy", "3")
                .text(function(d){ return numero(d);});

            parties.exit().remove();
            label.text(periodos[Math.round(period)].nome);
            quantidade_votacoes = periodos[Math.round(period)].quantidade_votacoes
            total_label.text(quantidade_votacoes + " votações");
        }

        // Interpolates the dataset for the given (fractional) year.
        function interpolateData(year) {
            return partidos.map(function(d) {
                return {
                    nome: nome(d),
                    numero: numero(d),
                    cor: cor(d),
                    tamanho: tamanho(d), //interpolateValues(d.tamanho, year),
                    x: interpolateValues(x(d), year),
                    y: interpolateValues(y(d), year)
                };
            });
        }

        // Finds (and possibly interpolates) the value for the specified year.
        function interpolateValues(values, year) {
            var i = bisect.left(values, year),
                a = values[i];
            if (i > 0) {
                var b = values[i - 1],
                    t = (year - a[0]) / (b[0] - a[0]);
                return a[1] * (1 - t) + b[1] * t;
            }
            return a[1];
        }
    }

    return {
        initialize:initialize
    };
})(jQuery);
