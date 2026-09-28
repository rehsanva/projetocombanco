const API = 'http://127.0.0.1:8000'  // endereço da nossa API
const formCliente = document.getElementById('form-cliente')
const botaoSubmit = document.getElementById('btn-submit-cliente')

function limparFormulario() {
  formCliente.reset()
  delete formCliente.dataset.idCliente
  botaoSubmit.textContent = 'Cadastrar'
  botaoSubmit.classList.remove('btn-success')
  botaoSubmit.classList.add('btn-primary')
}

async function listarClientes() {
  const resposta = await fetch(`${API}/clientes`)
  const clientes = await resposta.json()

  const corpo = document.getElementById('corpo-tabela')
  corpo.innerHTML = ''

  clientes.forEach(c => {
    corpo.innerHTML += `
      <tr>
        <td>${c.idcliente}</td>
        <td>${c.nome}</td>
        <td>${c.cpf}</td>
        <td>${c.telefone ?? '-'}</td>
        <td>${c.cidade ?? '-'}</td>
        <td>${c.uf ?? '-'}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick='preencherFormularioEdicao(${JSON.stringify(c)})'>Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarCliente(${c.idcliente})">Excluir</button>
        </td>
      </tr>`
  })
}

listarClientes()

formCliente.addEventListener('submit', async (e) => {
  e.preventDefault()

  const cliente = {
    nome: document.getElementById('nome').value,
    cpf: document.getElementById('cpf').value,
    telefone: document.getElementById('telefone').value || null,
    datacadastro: new Date().toISOString().split('T')[0],
    cidade: document.getElementById('cidade').value || null,
    uf: document.getElementById('uf').value || null
  }

  const idCliente = formCliente.dataset.idCliente

  if (idCliente) {
    await fetch(`${API}/clientes/${idCliente}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    })
  } else {
    await fetch(`${API}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente)
    })
  }

  limparFormulario()
  listarClientes()
})

function preencherFormularioEdicao(cliente) {
  document.getElementById('nome').value = cliente.nome
  document.getElementById('cpf').value = cliente.cpf
  document.getElementById('telefone').value = cliente.telefone || ''
  document.getElementById('cidade').value = cliente.cidade || ''
  document.getElementById('uf').value = cliente.uf || ''

  formCliente.dataset.idCliente = cliente.idcliente
  botaoSubmit.textContent = 'Salvar alteração'
  botaoSubmit.classList.remove('btn-primary')
  botaoSubmit.classList.add('btn-success')
}

async function deletarCliente(id) {
  if (!confirm('Tem certeza que deseja excluir este cliente?')) return

  await fetch(`${API}/clientes/${id}`, { method: 'DELETE' })
  listarClientes()
}