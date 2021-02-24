<!doctype html>
<html>

<head>
    <style>
        body {
            font-size: 10px;
        }
    </style>
</head>
<script id="qbit_vs" type="x-shader/x-vertex">
    #version 300 es
    precision highp float;
    uniform int N;
    uniform int m;
    uniform float point_size;
    layout(location=0) in float state;
    layout(location=1) in float index;
    out vec4 vColor;
    void main() {
        // MEMO GLの2D座標は[-1:1], ピクセルの中心は(0.5, 0.5)
        float x = (float(int(index) % N) + 0.5) / float(N) * 2.0 - 1.0;
        float y = (float(int(index) / N) + 0.5) / float(m) * 2.0 - 1.0;
        gl_Position = vec4(x, y, 0.0, 1.0);
        gl_PointSize = point_size;
        if(state > 0.0)
            vColor = vec4(1.0, 0.0, 0.0, 1.0);
        else
            vColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
</script>
<script id="qbit_fs" type="x-shader/x-fragment">
    #version 300 es
    precision highp float;
    in vec4 vColor;
    out vec4 outColor;
    void main() {
        outColor = vColor;
    }
</script>
<body>
    G=<span id="GG"></span>
    <br><br>
    <canvas id="gl_canvas" width="150" height="50"></canvas>
    <script>
        //parameters
        const N = 1500
        const m = 750
        const kT = 0.0005
        const loop = 50000
        let G = 5 
        let q = new Float32Array(N * m)
        let jij = 1

        const point_size = 1 

        let index = new Float32Array(N * m)
        for(let i = 0; i < N * m; i++)
            index[i] = i

        //qbit initialize
        for(let i = 0; i < N * m; i++)
            q[i] = Math.floor(Math.random() - 0.5) * 2 + 1

        // WebGL variables
        let gl_canvas, gl, qbit_vbo, index_vbo
        window.onload = function() {
            gl_canvas = document.getElementById('gl_canvas')
            gl = gl_canvas.getContext("webgl2")
            gl.clearColor(0.8, 0.8, 0.8, 1.0)
            gl.canvas.width = N * point_size
            gl.canvas.height = m * point_size
            index_vbo = createVbo(index)
            qbit_vbo = createDynamicVbo(q)
            draw_program = createProgram(document.getElementById('qbit_vs').text, document.getElementById('qbit_fs').text)
            update()
        }
        // main
        function update() {
            // calculate
            if (G < 0.001) {
                G = 5 
                for(let i = 0; i < N * m; i++)
                    q[i] = Math.floor(Math.random() - 0.5) * 2 + 1
            }
            anneal()
            // draw
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(draw_program)
            gl.bindBuffer(gl.ARRAY_BUFFER, qbit_vbo) // VBOをBindして
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, q) // 更新
            gl.uniform1i(gl.getUniformLocation(draw_program, 'N'), N)
            gl.uniform1i(gl.getUniformLocation(draw_program, 'm'), m)
            gl.uniform1f(gl.getUniformLocation(draw_program, 'point_size'), point_size)
            setAttribute(qbit_vbo, 0, 1)
            setAttribute(index_vbo, 1, 1)
            gl.drawArrays(gl.POINTS, 0, N * m)

            window.requestAnimationFrame(update)
        }

        function anneal() {
            //monte carlo loop start
            for (var k = 0; k < loop; k++) {
                const y = Math.floor(Math.random() * m) //select random trotter
                const x = Math.floor(Math.random() * N) //select random qbit
                //Energy difference calc
                let dE = (jij * 2 * q[y*N + x] * q[y*N + (N + x - 1) % N] + jij * 2 * q[y*N + x] * q[y*N + (x + 1) % N]) / m
                const kk = G / kT / m
                const kk1 = Math.exp(kk)
                const kk2 = Math.exp(-kk)
                //Quantum flactuation calc
                dE += q[y*N + x] * (q[((m + y - 1) % m)*N + x]
                    + q[((y + 1) % m)*N + x]) * Math.log((kk1 + kk2) / (kk1 - kk2)) / kT
                if (dE < 0 || Math.exp(-dE / kT) > Math.random()) // Metropolis
                    q[y*N + x] = -q[y*N + x] //flipping qbit
            }
            G *= 0.99
            document.getElementById('GG').innerHTML = G
        }

        // WebGL functions
        function setAttribute(vbo, attrib_loc, stride) {
            gl.enableVertexAttribArray(attrib_loc)
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
            gl.vertexAttribPointer(attrib_loc, stride, gl.FLOAT, false, 0, 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
        }

        function compileShader(prog, src, type) {
            const sh = gl.createShader(type)
            gl.shaderSource(sh, src.replace(/^\n/, ""))
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
                alert(gl.getShaderInfoLog(sh))
            gl.attachShader(prog, sh)
            gl.deleteShader(sh)
        }

        function createProgram(vs, fs) {
            const program = gl.createProgram()
            compileShader(program, vs, gl.VERTEX_SHADER)
            compileShader(program, fs, gl.FRAGMENT_SHADER)
            gl.linkProgram(program)
            return program
        }

        function createVbo(data) {
            const vbo = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
            return vbo
        }

        function createDynamicVbo(data) {
            const vbo = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
            return vbo
        }
    </script>
</body>

</html>
