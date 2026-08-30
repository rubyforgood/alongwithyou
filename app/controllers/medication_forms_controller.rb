class MedicationFormsController < ApplicationController
  before_action :set_medication_form, only: %i[ show edit update destroy ]

  # GET /medication_forms or /medication_forms.json
  def index
    @medication_forms = MedicationForm.all
  end

  # GET /medication_forms/1 or /medication_forms/1.json
  def show
  end

  # GET /medication_forms/new
  def new
    @medication_form = MedicationForm.new
  end

  # GET /medication_forms/1/edit
  def edit
  end

  # POST /medication_forms or /medication_forms.json
  def create
    @medication_form = MedicationForm.new(medication_form_params)

    respond_to do |format|
      if @medication_form.save
        format.html { redirect_to @medication_form, notice: "Medication form was successfully created." }
        format.json { render :show, status: :created, location: @medication_form }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @medication_form.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /medication_forms/1 or /medication_forms/1.json
  def update
    respond_to do |format|
      if @medication_form.update(medication_form_params)
        format.html { redirect_to @medication_form, notice: "Medication form was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @medication_form }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @medication_form.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /medication_forms/1 or /medication_forms/1.json
  def destroy
    @medication_form.destroy!

    respond_to do |format|
      format.html { redirect_to medication_forms_path, notice: "Medication form was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_medication_form
      @medication_form = MedicationForm.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def medication_form_params
      params.expect(medication_form: [ :name ])
    end
end
